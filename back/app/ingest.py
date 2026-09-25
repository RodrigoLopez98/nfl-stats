from datetime import datetime, date

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Game, SyncLog, TeamStat


def _num(value) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def _int(value) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def _date(value) -> date | None:
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def fetch_all(client: httpx.Client, path: str, params: dict) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    limit = 250
    while True:
        response = client.get(path, params={**params, "limit": limit, "offset": offset})
        response.raise_for_status()
        payload = response.json()
        batch = payload.get("data") or []
        rows.extend(batch)
        total = int(payload.get("total") or 0)
        if not batch or offset + len(batch) >= total:
            break
        offset += len(batch)
    return rows


def _prefer_regular(rows: list[dict]) -> list[dict]:
    regular = [row for row in rows if row.get("season_type") == "REG"]
    return regular or rows


def sync_season(db: Session, season: int) -> dict:
    log = SyncLog(season=season, started_at=datetime.utcnow())
    db.add(log)
    db.flush()
    try:
        with httpx.Client(base_url=settings.nfl_api_base, timeout=60.0) as client:
            games = fetch_all(client, "/v1/games", {"season": season})
            stats = fetch_all(client, "/v1/stats/team", {"season": season})
        stats = _prefer_regular(stats)
        games_upserted = _upsert_games(db, games)
        teams_upserted = _upsert_stats(db, season, stats)
        log.games_upserted = games_upserted
        log.teams_upserted = teams_upserted
        log.ok = True
        log.message = "ok"
        log.finished_at = datetime.utcnow()
        db.commit()
        return {
            "ok": True,
            "season": season,
            "games": games_upserted,
            "teams": teams_upserted,
        }
    except Exception as exc:
        db.rollback()
        failed = SyncLog(
            season=season,
            started_at=log.started_at,
            finished_at=datetime.utcnow(),
            ok=False,
            message=str(exc)[:500],
        )
        db.add(failed)
        db.commit()
        raise


def _upsert_games(db: Session, rows: list[dict]) -> int:
    count = 0
    for row in rows:
        game_id = row.get("game_id")
        home = row.get("home_team")
        away = row.get("away_team")
        if not game_id or not home or not away:
            continue
        game = db.get(Game, game_id)
        if game is None:
            game = Game(game_id=game_id, season=int(row["season"]), week=int(row["week"]))
            db.add(game)
        game.season = int(row["season"])
        game.week = int(row["week"])
        game.game_type = row.get("game_type") or "REG"
        game.gameday = _date(row.get("gameday"))
        game.home_team = home
        game.away_team = away
        game.home_score = _int(row.get("home_score"))
        game.away_score = _int(row.get("away_score"))
        game.stadium = row.get("stadium")
        game.api_spread = _num(row.get("spread_line"))
        game.api_total = _num(row.get("total_line"))
        count += 1
    return count


def _upsert_stats(db: Session, season: int, rows: list[dict]) -> int:
    count = 0
    seen: set[str] = set()
    for row in rows:
        team = row.get("team")
        if not team or team in seen:
            continue
        seen.add(team)
        stat = db.scalar(select(TeamStat).where(TeamStat.season == season, TeamStat.team == team))
        if stat is None:
            stat = TeamStat(season=season, team=team)
            db.add(stat)
        passing_fd = _num(row.get("passing_first_downs")) or 0
        rushing_fd = _num(row.get("rushing_first_downs")) or 0
        solo = _num(row.get("def_tackles_solo")) or 0
        assists = _num(row.get("def_tackle_assists")) or 0
        stat.season_type = row.get("season_type") or "REG"
        stat.games = int(row.get("games") or 0)
        stat.passing_yards = _num(row.get("passing_yards")) or 0
        stat.rushing_yards = _num(row.get("rushing_yards")) or 0
        stat.receiving_yards = _num(row.get("receiving_yards")) or 0
        stat.first_downs = passing_fd + rushing_fd
        stat.sacks = _num(row.get("def_sacks")) or 0
        stat.interceptions = _num(row.get("def_interceptions")) or 0
        stat.forced_fumbles = _num(row.get("def_fumbles_forced")) or 0
        stat.tackles = solo + assists
        stat.synced_at = datetime.utcnow()
        count += 1
    return count
