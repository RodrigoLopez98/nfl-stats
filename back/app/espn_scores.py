"""Marcadores en vivo: nfldata suele ir retrasado; ESPN los publica el mismo día."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Game

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

# ESPN ↔ abreviaturas que usa nfldata en games/scoring
ESPN_TO_INTERNAL: dict[str, str] = {
    "WSH": "WAS",
}


def _norm_abbr(abbr: str) -> str:
    upper = abbr.upper()
    return ESPN_TO_INTERNAL.get(upper, upper)


def _fetch_scoreboard(client: httpx.Client, gameday: date) -> list[dict]:
    ymd = gameday.strftime("%Y%m%d")
    response = client.get(ESPN_SCOREBOARD, params={"dates": ymd})
    response.raise_for_status()
    return response.json().get("events") or []


def _final_scores(event: dict) -> tuple[str, int, str, int] | None:
    competition = (event.get("competitions") or [None])[0]
    if not competition:
        return None
    status = (competition.get("status") or {}).get("type") or {}
    if status.get("name") != "STATUS_FINAL" and not status.get("completed"):
        return None
    away_abbr = home_abbr = None
    away_score = home_score = None
    for team in competition.get("competitors") or []:
        abbr = _norm_abbr((team.get("team") or {}).get("abbreviation") or "")
        score_raw = team.get("score")
        if score_raw is None or score_raw == "":
            return None
        score = int(score_raw)
        if team.get("homeAway") == "home":
            home_abbr, home_score = abbr, score
        else:
            away_abbr, away_score = abbr, score
    if not away_abbr or not home_abbr or away_score is None or home_score is None:
        return None
    return away_abbr, away_score, home_abbr, home_score


def enrich_scores_from_espn(db: Session, season: int) -> int:
    pending = db.scalars(
        select(Game).where(
            Game.season == season,
            Game.game_type == "REG",
            Game.home_score.is_(None),
            Game.gameday.is_not(None),
        )
    ).all()
    if not pending:
        return 0

    by_day: dict[date, list[Game]] = defaultdict(list)
    for game in pending:
        by_day[game.gameday].append(game)

    updated = 0
    with httpx.Client(timeout=30.0) as client:
        for gameday, day_games in by_day.items():
            try:
                events = _fetch_scoreboard(client, gameday)
            except httpx.HTTPError:
                continue
            lookup: dict[tuple[str, str], tuple[int, int]] = {}
            for event in events:
                parsed = _final_scores(event)
                if not parsed:
                    continue
                away_abbr, away_score, home_abbr, home_score = parsed
                lookup[(away_abbr, home_abbr)] = (away_score, home_score)
                lookup[(home_abbr, away_abbr)] = (home_score, away_score)

            for game in day_games:
                away = _norm_abbr(game.away_team)
                home = _norm_abbr(game.home_team)
                scores = lookup.get((away, home))
                if not scores:
                    continue
                game.away_score, game.home_score = scores
                updated += 1

    return updated
