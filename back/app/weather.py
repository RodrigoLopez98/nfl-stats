from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

from app.models import Game

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
CHICAGO = ZoneInfo("America/Chicago")
FORECAST_DAYS = 16

# lat, lon for every stadium in the 2026 schedule.
STADIUMS: dict[str, tuple[float, float]] = {
    "Acrisure Stadium": (40.4468, -80.0158),
    "Allegiant Stadium": (36.0909, -115.1833),
    "AT&T Stadium": (32.7473, -97.0945),
    "Bank of America Stadium": (35.2258, -80.8528),
    "Bernabeu": (40.4531, -3.6883),
    "Caesars Superdome": (29.9511, -90.0812),
    "Empower Field at Mile High": (39.7439, -105.0201),
    "Estadio Banorte": (19.3029, -99.1505),
    "EverBank Stadium": (30.3239, -81.6373),
    "FC Bayern Munich Stadium": (48.2188, 11.6247),
    "Ford Field": (42.3400, -83.0456),
    "GEHA Field at Arrowhead Stadium": (39.0489, -94.4839),
    "Gillette Stadium": (42.0909, -71.2643),
    "Hard Rock Stadium": (25.9580, -80.2389),
    "Highmark Stadium": (42.7738, -78.7870),
    "Huntington Bank Field": (41.5061, -81.6995),
    "Lambeau Field": (44.5013, -88.0622),
    "Levi's Stadium": (37.4032, -121.9698),
    "Lincoln Financial Field": (39.9008, -75.1675),
    "Lucas Oil Stadium": (39.7601, -86.1639),
    "Lumen Field": (47.5952, -122.3316),
    "M&T Bank Stadium": (39.2780, -76.6227),
    "Maracana Stadium": (-22.9121, -43.2302),
    "Melbourne Cricket Ground": (-37.8200, 144.9834),
    "Mercedes-Benz Stadium": (33.7554, -84.4008),
    "MetLife Stadium": (40.8128, -74.0742),
    "Nissan Stadium": (36.1665, -86.7713),
    "Northwest Stadium": (38.9078, -76.8644),
    "Paycor Stadium": (39.0955, -84.5161),
    "Raymond James Stadium": (27.9759, -82.5033),
    "Reliant Stadium": (29.6847, -95.4107),
    "SoFi Stadium": (33.9535, -118.3392),
    "Soldier Field": (41.8623, -87.6167),
    "Stade de France": (48.9245, 2.3601),
    "State Farm Stadium": (33.5276, -112.2626),
    "Tottenham Hotspur Stadium": (51.6043, -0.0664),
    "U.S. Bank Stadium": (44.9738, -93.2577),
    "Wembley Stadium": (51.5560, -0.2796),
}


@dataclass(frozen=True)
class Reading:
    temp_c: float
    precip: int | None
    wind_kmh: int | None


def _today() -> date:
    return datetime.now(CHICAGO).date()


def _kickoff_hour(gameday: date) -> int:
    if gameday.weekday() == 3:
        return 20
    if gameday.weekday() == 0:
        return 18
    return 13


def needs_weather(game: Game, today: date | None = None) -> bool:
    today = today or _today()
    if game.gameday is None or not game.stadium or game.stadium not in STADIUMS:
        return False
    if game.gameday > today + timedelta(days=FORECAST_DAYS):
        return False
    if game.weather_at is None or game.weather_c is None:
        return True
    if game.gameday >= today:
        return game.weather_at < datetime.utcnow() - timedelta(hours=3)
    return False


def _reading(payload: dict, gameday: date) -> Reading | None:
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    target = f"{gameday.isoformat()}T{_kickoff_hour(gameday):02d}:00"
    try:
        index = times.index(target)
    except ValueError:
        return None
    temps = hourly.get("temperature_2m") or []
    if index >= len(temps) or temps[index] is None:
        return None
    precip_series = hourly.get("precipitation_probability") or []
    wind_series = hourly.get("wind_speed_10m") or []
    precip = precip_series[index] if index < len(precip_series) else None
    wind = wind_series[index] if index < len(wind_series) else None
    return Reading(
        temp_c=round(float(temps[index]), 1),
        precip=None if precip is None else int(round(precip)),
        wind_kmh=None if wind is None else int(round(wind)),
    )


def fetch_reading(game: Game, today: date | None = None) -> Reading | None:
    today = today or _today()
    point = STADIUMS.get(game.stadium or "")
    if point is None or game.gameday is None:
        return None
    lat, lon = point
    past = game.gameday < today
    url = ARCHIVE_URL if past else FORECAST_URL
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        response = client.get(
            url,
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": "temperature_2m,precipitation_probability,wind_speed_10m",
                "timezone": "America/New_York",
                "start_date": game.gameday.isoformat(),
                "end_date": game.gameday.isoformat(),
                "wind_speed_unit": "kmh",
            },
        )
        response.raise_for_status()
        return _reading(response.json(), game.gameday)


def refresh_games(db, games: list[Game]) -> int:
    today = _today()
    pending = [game for game in games if needs_weather(game, today)]
    if not pending:
        return 0
    saved = 0
    with ThreadPoolExecutor(max_workers=6) as pool:
        fetched = list(pool.map(lambda game: _safe_fetch(game, today), pending))
    for game, reading in fetched:
        if reading is None:
            continue
        game.weather_c = reading.temp_c
        game.weather_precip = reading.precip
        game.weather_wind = reading.wind_kmh
        game.weather_at = datetime.utcnow()
        saved += 1
    if saved:
        db.commit()
    return saved


def _safe_fetch(game: Game, today: date) -> tuple[Game, Reading | None]:
    try:
        return game, fetch_reading(game, today)
    except httpx.HTTPError:
        return game, None
