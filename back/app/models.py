from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Game(Base):
    __tablename__ = "games"

    game_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    season: Mapped[int] = mapped_column(Integer, index=True)
    week: Mapped[int] = mapped_column(Integer, index=True)
    game_type: Mapped[str] = mapped_column(String(8), default="REG")
    gameday: Mapped[date | None] = mapped_column(Date, nullable=True)
    home_team: Mapped[str] = mapped_column(String(8), index=True)
    away_team: Mapped[str] = mapped_column(String(8), index=True)
    home_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stadium: Mapped[str | None] = mapped_column(String(120), nullable=True)
    api_spread: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    api_total: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)


class TeamStat(Base):
    __tablename__ = "team_stats"
    __table_args__ = (UniqueConstraint("season", "team", name="uq_team_stats_season_team"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season: Mapped[int] = mapped_column(Integer, index=True)
    team: Mapped[str] = mapped_column(String(8), index=True)
    season_type: Mapped[str] = mapped_column(String(16), default="REG")
    games: Mapped[int] = mapped_column(Integer, default=0)
    passing_yards: Mapped[float] = mapped_column(Numeric(10, 1), default=0)
    rushing_yards: Mapped[float] = mapped_column(Numeric(10, 1), default=0)
    receiving_yards: Mapped[float] = mapped_column(Numeric(10, 1), default=0)
    first_downs: Mapped[float] = mapped_column(Numeric(10, 1), default=0)
    sacks: Mapped[float] = mapped_column(Numeric(8, 1), default=0)
    interceptions: Mapped[float] = mapped_column(Numeric(8, 1), default=0)
    forced_fumbles: Mapped[float] = mapped_column(Numeric(8, 1), default=0)
    tackles: Mapped[float] = mapped_column(Numeric(8, 1), default=0)
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SlateEntry(Base):
    __tablename__ = "slate_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.game_id"), unique=True, index=True)
    season: Mapped[int] = mapped_column(Integer, index=True)
    week: Mapped[int] = mapped_column(Integer, index=True)
    spread: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    total: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    odds_moneyline: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    odds_total: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    pick_ari: Mapped[str | None] = mapped_column(String(40), nullable=True)
    pick_cabo: Mapped[str | None] = mapped_column(String(40), nullable=True)
    pick_spread: Mapped[str | None] = mapped_column(String(40), nullable=True)
    pick_sportsline: Mapped[str | None] = mapped_column(String(40), nullable=True)
    pick_castle: Mapped[str | None] = mapped_column(String(40), nullable=True)
    pick_alfredo: Mapped[str | None] = mapped_column(String(40), nullable=True)
    injuries: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)


class BankrollLine(Base):
    __tablename__ = "bankroll_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_key: Mapped[str] = mapped_column(String(40), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    label: Mapped[str] = mapped_column(String(80), default="")
    odds: Mapped[float] = mapped_column(Numeric(12, 4))
    stake: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    note: Mapped[str | None] = mapped_column(String(160), nullable=True)


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    games_upserted: Mapped[int] = mapped_column(Integer, default=0)
    teams_upserted: Mapped[int] = mapped_column(Integer, default=0)
    ok: Mapped[bool] = mapped_column(Boolean, default=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
