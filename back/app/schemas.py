from datetime import date, datetime

from pydantic import BaseModel, Field


class SlateIn(BaseModel):
    spread: float | None = None
    total: float | None = None
    odds_moneyline: float | None = None
    odds_total: float | None = None
    pick_ari: str | None = None
    pick_cabo: str | None = None
    pick_spread: str | None = None
    pick_sportsline: str | None = None
    pick_castle: str | None = None
    pick_alfredo: str | None = None
    injuries: str | None = None
    confirmed: bool = False


class BankrollIn(BaseModel):
    group_key: str = "parlay"
    sort_order: int = 0
    label: str = ""
    odds: float = Field(gt=0)
    stake: float | None = Field(default=None, ge=0)
    note: str | None = None


class CategoryOut(BaseModel):
    key: str
    label: str
    away_rank: int | None
    home_rank: int | None
    winner: str | None


class SideOut(BaseModel):
    abbr: str
    name: str
    wins: int
    losses: int
    ties: int
    ppg: float | None
    over_pct: float | None
    trend: str | None


class GameOut(BaseModel):
    game_id: str
    gameday: date | None
    away: SideOut
    home: SideOut
    projected_total: float | None
    book_total: float | None
    edge: float | None
    total_pick: str | None
    winner_record: str
    winner_ranks: str
    rank_away: int
    rank_home: int
    categories: list[CategoryOut]
    spread: float | None
    odds_moneyline: float | None
    odds_total: float | None
    api_spread: float | None
    api_total: float | None
    pick_ari: str | None
    pick_cabo: str | None
    pick_spread: str | None
    pick_sportsline: str | None
    pick_castle: str | None
    pick_alfredo: str | None
    injuries: str | None
    confirmed: bool
    away_score: int | None
    home_score: int | None
    actual_total: int | None
    actual_pick: str | None


class BoardOut(BaseModel):
    season: int
    week: int
    games: list[GameOut]


class RankRow(BaseModel):
    abbr: str
    name: str
    wins: int
    losses: int
    ppg: float | None
    ranks: dict[str, int | None]
    totals: dict[str, float]


class RankingsOut(BaseModel):
    season: int
    week: int
    categories: list[dict[str, str]]
    teams: list[RankRow]


class BankrollLineOut(BaseModel):
    id: int
    group_key: str
    sort_order: int
    label: str
    odds: float
    stake: float | None
    note: str | None
    stake_used: float | None
    payout: float | None


class StatusOut(BaseModel):
    season: int
    suggested_week: int | None
    weeks: list[int]
    last_sync: datetime | None
    games: int
    teams: int
