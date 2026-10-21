import csv
import io

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Game, InjuryReport
from app.teams import canon_abbr

SCHEDULES_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"
INJURIES_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries"

KEPT_STATUS = ("Out", "Injured Reserve", "Doubtful", "Suspension", "Questionable")
STATUS_RANK = {name: index for index, name in enumerate(KEPT_STATUS)}
GENERIC_NOTES = {
    "questionable",
    "doubtful",
    "out",
    "ir",
    "injured reserve",
    "suspension",
    "reserve-sus",
    "active",
}


def _blank(value: str | None) -> bool:
    return value is None or str(value).strip() == ""


def _int(value: str | None) -> int | None:
    if _blank(value):
        return None
    return int(float(value))


def _float(value: str | None) -> float | None:
    if _blank(value):
        return None
    return float(value)


def enrich_schedule(db: Session, season: int) -> str:
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        response = client.get(SCHEDULES_URL)
        response.raise_for_status()
    updated = 0
    for row in csv.DictReader(io.StringIO(response.text)):
        if str(row.get("season")) != str(season) or row.get("game_type") != "REG":
            continue
        game = db.get(Game, row.get("game_id"))
        if game is None:
            continue
        spread = _float(row.get("spread_line"))
        total = _float(row.get("total_line"))
        if spread is not None:
            # nflverse spread_line is the away team's line. The app stores the home line.
            game.api_spread = -spread
        if total is not None:
            game.api_total = total
        roof = (row.get("roof") or "").strip()
        if roof:
            game.roof = roof[:24]
        temp = _int(row.get("temp"))
        wind = _int(row.get("wind"))
        if temp is not None:
            game.temp = temp
        if wind is not None:
            game.wind = wind
        game.away_moneyline = _int(row.get("away_moneyline"))
        game.home_moneyline = _int(row.get("home_moneyline"))
        updated += 1
    return f"schedule={updated}"


def _detail(row: dict) -> str | None:
    short = (row.get("shortComment") or "").strip()
    long = (row.get("longComment") or "").strip()
    text = long if short.lower() in GENERIC_NOTES or len(short) < 12 else short
    if text.lower() in GENERIC_NOTES or len(text) < 12:
        return None
    return text[:180]


def enrich_injuries(db: Session, season: int) -> str:
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        response = client.get(INJURIES_URL)
        response.raise_for_status()
    payload = response.json()
    reports: list[InjuryReport] = []
    seen: set[tuple[str, str]] = set()
    for team in payload.get("injuries") or []:
        for row in team.get("injuries") or []:
            status = row.get("status")
            status_name = status.get("name") if isinstance(status, dict) else status
            if status_name not in STATUS_RANK:
                continue
            athlete = row.get("athlete") or {}
            name = (athlete.get("displayName") or "").strip()
            team_abbr = canon_abbr(((athlete.get("team") or {}).get("abbreviation")))
            if not name or not team_abbr:
                continue
            key = (team_abbr, name)
            if key in seen:
                continue
            seen.add(key)
            position = ((athlete.get("position") or {}).get("abbreviation") or "")[:8]
            reports.append(
                InjuryReport(
                    season=season,
                    team=team_abbr,
                    player=name[:80],
                    position=position,
                    status=status_name,
                    detail=_detail(row),
                )
            )
    reports.sort(key=lambda item: (item.team, STATUS_RANK.get(item.status, 9), item.player))
    db.execute(delete(InjuryReport).where(InjuryReport.season == season))
    db.add_all(reports)
    return f"injuries={len(reports)}"


def injury_map(db: Session, season: int) -> dict[str, list[dict]]:
    rows = db.scalars(select(InjuryReport).where(InjuryReport.season == season)).all()
    grouped: dict[str, list[InjuryReport]] = {}
    for row in rows:
        grouped.setdefault(row.team, []).append(row)
    result: dict[str, list[dict]] = {}
    for team, items in grouped.items():
        items.sort(key=lambda item: (STATUS_RANK.get(item.status, 9), item.player))
        result[team] = [
            {
                "name": item.player,
                "pos": item.position,
                "status": item.status,
                "detail": item.detail,
            }
            for item in items
        ]
    return result
