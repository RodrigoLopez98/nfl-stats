"""Reglas de EQUIPOS / XPUNTOS.

El número de ranking más alto es el peor. OVER solo si la proyección
supera la línea (un empate exacto queda UNDER, como en el Excel).
El porcentaje histórico de overs no cuenta BYE: solo partidos jugados.
"""

from __future__ import annotations

from dataclasses import dataclass

RANK_CATEGORIES: list[tuple[str, str]] = [
    ("passing", "Yardas aéreas"),
    ("receiving", "Receiving"),
    ("first_downs", "First downs"),
    ("rushing", "Yardas terrestres"),
    ("points", "Puntos"),
    ("sacks", "Sacks"),
    ("interceptions", "Intercepciones"),
    ("forced_fumbles", "Fumbles forzados"),
    ("tackles", "Tackles"),
]

RANK_KEYS = [key for key, _label in RANK_CATEGORIES]


@dataclass(frozen=True)
class Record:
    name: str
    wins: int
    losses: int


@dataclass(frozen=True)
class PlayedGame:
    points_for: int
    points_against: int


def is_counted_game(game_type: str | None, home_score: int | None, away_score: int | None) -> bool:
    return game_type == "REG" and home_score is not None and away_score is not None


def project_total(ppg_away: float | None, ppg_home: float | None) -> float | None:
    if ppg_away is None or ppg_home is None:
        return None
    return ppg_away + ppg_home


def pick_over_under(projected: float | None, line: float | None) -> str | None:
    if projected is None or line is None:
        return None
    return "OVER" if projected > line else "UNDER"


def historical_over_pct(games: list[PlayedGame], line: float | None) -> float | None:
    if line is None or not games:
        return None
    overs = sum(1 for game in games if (game.points_for + game.points_against) > line)
    return overs / len(games)


def pick_trend(over_pct: float | None) -> str | None:
    if over_pct is None:
        return None
    return "OVER" if over_pct > 0.5 else "UNDER"


def winner_by_record(away: Record, home: Record) -> str:
    away_key = (away.wins, -away.losses)
    home_key = (home.wins, -home.losses)
    if away_key == home_key:
        return "EMPATE"
    return away.name if away_key > home_key else home.name


def assign_ranks(per_game: dict[str, dict[str, float | None]]) -> dict[str, dict[str, int]]:
    ranks: dict[str, dict[str, int]] = {team: {} for team in per_game}
    for key in RANK_KEYS:
        series = []
        for team, values in per_game.items():
            raw = values.get(key)
            if raw is None:
                continue
            series.append((team, round(float(raw), 4)))
        series.sort(key=lambda item: item[1], reverse=True)
        rank = 0
        previous: float | None = None
        for index, (team, value) in enumerate(series, start=1):
            if previous is None or value != previous:
                rank = index
                previous = value
            ranks[team][key] = rank
    return ranks


def winner_by_ranks(
    away_name: str,
    away_ranks: dict[str, int],
    home_name: str,
    home_ranks: dict[str, int],
) -> tuple[str, int, int, list[dict]]:
    away_wins = 0
    home_wins = 0
    detail = []
    for key, label in RANK_CATEGORIES:
        away_rank = away_ranks.get(key)
        home_rank = home_ranks.get(key)
        winner = None
        if away_rank is not None and home_rank is not None:
            if away_rank < home_rank:
                away_wins += 1
                winner = away_name
            elif home_rank < away_rank:
                home_wins += 1
                winner = home_name
        detail.append(
            {
                "key": key,
                "label": label,
                "away_rank": away_rank,
                "home_rank": home_rank,
                "winner": winner,
            }
        )
    if away_wins > home_wins:
        pick = away_name
    elif home_wins > away_wins:
        pick = home_name
    else:
        pick = "EMPATE"
    return pick, away_wins, home_wins, detail
