from collections import defaultdict
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.engine import (
    RANK_CATEGORIES,
    PlayedGame,
    Record,
    assign_ranks,
    historical_over_pct,
    is_counted_game,
    pick_over_under,
    pick_trend,
    project_total,
    winner_by_ranks,
    winner_by_record,
)
from app.models import BankrollLine, Game, SlateEntry, SyncLog, TeamStat
from app.schemas import (
    BankrollLineOut,
    BoardOut,
    CategoryOut,
    GameOut,
    RankRow,
    RankingsOut,
    SideOut,
    StatusOut,
)
from app.teams import TEAMS


def default_season(today: date | None = None) -> int:
    today = today or date.today()
    return today.year if today.month >= 3 else today.year - 1


def _f(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _team_name(abbr: str) -> str:
    return TEAMS.get(abbr, abbr)


def suggest_week(db: Session, season: int) -> int | None:
    rows = db.execute(
        select(Game.week, Game.home_score, Game.game_type).where(Game.season == season, Game.game_type == "REG")
    ).all()
    if not rows:
        return None
    weeks = sorted({row.week for row in rows})
    for week in weeks:
        pending = any(row.week == week and row.home_score is None for row in rows)
        if pending:
            return week
    return weeks[-1]


def _snapshots(db: Session, season: int, before_week: int):
    games = db.scalars(
        select(Game).where(Game.season == season, Game.week < before_week, Game.game_type == "REG")
    ).all()
    played: dict[str, list[PlayedGame]] = defaultdict(list)
    wins: dict[str, int] = defaultdict(int)
    losses: dict[str, int] = defaultdict(int)
    ties: dict[str, int] = defaultdict(int)
    points: dict[str, int] = defaultdict(int)

    for game in games:
        if not is_counted_game(game.game_type, game.home_score, game.away_score):
            continue
        home_score = int(game.home_score)
        away_score = int(game.away_score)
        played[game.home_team].append(PlayedGame(home_score, away_score))
        played[game.away_team].append(PlayedGame(away_score, home_score))
        points[game.home_team] += home_score
        points[game.away_team] += away_score
        if home_score > away_score:
            wins[game.home_team] += 1
            losses[game.away_team] += 1
        elif away_score > home_score:
            wins[game.away_team] += 1
            losses[game.home_team] += 1
        else:
            ties[game.home_team] += 1
            ties[game.away_team] += 1

    stats = db.scalars(select(TeamStat).where(TeamStat.season == season)).all()
    stat_by_team = {row.team: row for row in stats}
    per_game: dict[str, dict[str, float | None]] = {}
    totals: dict[str, dict[str, float]] = {}
    teams = set(played) | set(stat_by_team)
    for abbr in teams:
        counted = len(played[abbr])
        stat = stat_by_team.get(abbr)
        denom = counted or (stat.games if stat else 0)
        raw = {
            "passing": _f(stat.passing_yards) if stat else None,
            "receiving": _f(stat.receiving_yards) if stat else None,
            "first_downs": _f(stat.first_downs) if stat else None,
            "rushing": _f(stat.rushing_yards) if stat else None,
            "points": float(points[abbr]) if counted else None,
            "sacks": _f(stat.sacks) if stat else None,
            "interceptions": _f(stat.interceptions) if stat else None,
            "forced_fumbles": _f(stat.forced_fumbles) if stat else None,
            "tackles": _f(stat.tackles) if stat else None,
        }
        totals[abbr] = {key: value for key, value in raw.items() if value is not None}
        per_game[abbr] = {
            key: (value / denom if value is not None and denom else None) for key, value in raw.items()
        }
    ranks = assign_ranks(per_game)
    return played, wins, losses, ties, points, per_game, totals, ranks


def _side(abbr: str, wins, losses, ties, points, played, ranks, line: float | None) -> SideOut:
    games = played[abbr]
    counted = len(games)
    ppg = (points[abbr] / counted) if counted else None
    over_pct = historical_over_pct(games, line)
    return SideOut(
        abbr=abbr,
        name=_team_name(abbr),
        wins=wins[abbr],
        losses=losses[abbr],
        ties=ties[abbr],
        ppg=round(ppg, 2) if ppg is not None else None,
        over_pct=round(over_pct, 4) if over_pct is not None else None,
        trend=pick_trend(over_pct),
    )


def build_board(db: Session, season: int, week: int) -> BoardOut:
    played, wins, losses, ties, points, _per, _totals, ranks = _snapshots(db, season, week)
    slate_games = db.scalars(
        select(Game)
        .where(Game.season == season, Game.week == week, Game.game_type == "REG")
        .order_by(Game.gameday, Game.game_id)
    ).all()
    entries = {
        row.game_id: row
        for row in db.scalars(select(SlateEntry).where(SlateEntry.season == season, SlateEntry.week == week)).all()
    }
    cards: list[GameOut] = []
    for game in slate_games:
        entry = entries.get(game.game_id)
        line = _f(entry.total) if entry and entry.total is not None else _f(game.api_total)
        spread = _f(entry.spread) if entry and entry.spread is not None else _f(game.api_spread)
        away = _side(game.away_team, wins, losses, ties, points, played, ranks, line)
        home = _side(game.home_team, wins, losses, ties, points, played, ranks, line)
        projected = project_total(away.ppg, home.ppg)
        if projected is not None:
            projected = round(projected, 2)
        edge = round(projected - line, 2) if projected is not None and line is not None else None
        pick, away_cats, home_cats, detail = winner_by_ranks(
            away.name, ranks.get(game.away_team, {}), home.name, ranks.get(game.home_team, {})
        )
        actual_total = None
        actual_pick = None
        if game.home_score is not None and game.away_score is not None and line is not None:
            actual_total = int(game.home_score) + int(game.away_score)
            actual_pick = "OVER" if actual_total > line else "UNDER"
        cards.append(
            GameOut(
                game_id=game.game_id,
                gameday=game.gameday,
                away=away,
                home=home,
                projected_total=projected,
                book_total=line,
                edge=edge,
                total_pick=pick_over_under(projected, line),
                winner_record=winner_by_record(
                    Record(away.name, away.wins, away.losses),
                    Record(home.name, home.wins, home.losses),
                ),
                winner_ranks=pick,
                rank_away=away_cats,
                rank_home=home_cats,
                categories=[CategoryOut(**item) for item in detail],
                spread=spread,
                odds_moneyline=_f(entry.odds_moneyline) if entry else None,
                odds_total=_f(entry.odds_total) if entry else None,
                api_spread=_f(game.api_spread),
                api_total=_f(game.api_total),
                pick_ari=entry.pick_ari if entry else None,
                pick_cabo=entry.pick_cabo if entry else None,
                pick_spread=entry.pick_spread if entry else None,
                pick_sportsline=entry.pick_sportsline if entry else None,
                pick_castle=entry.pick_castle if entry else None,
                pick_alfredo=entry.pick_alfredo if entry else None,
                injuries=entry.injuries if entry else None,
                confirmed=bool(entry.confirmed) if entry else False,
                away_score=game.away_score,
                home_score=game.home_score,
                actual_total=actual_total,
                actual_pick=actual_pick,
            )
        )
    return BoardOut(season=season, week=week, games=cards)


def build_rankings(db: Session, season: int, week: int) -> RankingsOut:
    played, wins, losses, _ties, points, _per, totals, ranks = _snapshots(db, season, week)
    teams = []
    for abbr in sorted(set(played) | set(ranks), key=lambda item: _team_name(item)):
        counted = len(played[abbr])
        ppg = (points[abbr] / counted) if counted else None
        teams.append(
            RankRow(
                abbr=abbr,
                name=_team_name(abbr),
                wins=wins[abbr],
                losses=losses[abbr],
                ppg=round(ppg, 2) if ppg is not None else None,
                ranks={key: ranks.get(abbr, {}).get(key) for key, _label in RANK_CATEGORIES},
                totals=totals.get(abbr, {}),
            )
        )
    return RankingsOut(
        season=season,
        week=week,
        categories=[{"key": key, "label": label} for key, label in RANK_CATEGORIES],
        teams=teams,
    )


def status(db: Session, season: int) -> StatusOut:
    weeks = [
        row[0]
        for row in db.execute(
            select(Game.week).where(Game.season == season, Game.game_type == "REG").distinct().order_by(Game.week)
        ).all()
    ]
    last = db.scalar(select(func.max(SyncLog.finished_at)).where(SyncLog.ok.is_(True), SyncLog.season == season))
    return StatusOut(
        season=season,
        suggested_week=suggest_week(db, season),
        weeks=weeks,
        last_sync=last,
        games=db.scalar(select(func.count()).select_from(Game).where(Game.season == season)) or 0,
        teams=db.scalar(select(func.count()).select_from(TeamStat).where(TeamStat.season == season)) or 0,
    )


def bankroll_view(db: Session) -> list[BankrollLineOut]:
    lines = db.scalars(select(BankrollLine).order_by(BankrollLine.group_key, BankrollLine.sort_order, BankrollLine.id)).all()
    running: dict[str, float | None] = {}
    output = []
    for line in lines:
        previous = running.get(line.group_key)
        stake_used = _f(line.stake) if line.stake is not None else previous
        payout = round(stake_used * float(line.odds), 2) if stake_used is not None else None
        running[line.group_key] = payout
        output.append(
            BankrollLineOut(
                id=line.id,
                group_key=line.group_key,
                sort_order=line.sort_order,
                label=line.label,
                odds=float(line.odds),
                stake=_f(line.stake),
                note=line.note,
                stake_used=stake_used,
                payout=payout,
            )
        )
    return output
