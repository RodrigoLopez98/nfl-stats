"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "games",
        sa.Column("game_id", sa.String(length=40), primary_key=True),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("week", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.String(length=8), nullable=False),
        sa.Column("gameday", sa.Date(), nullable=True),
        sa.Column("home_team", sa.String(length=8), nullable=False),
        sa.Column("away_team", sa.String(length=8), nullable=False),
        sa.Column("home_score", sa.Integer(), nullable=True),
        sa.Column("away_score", sa.Integer(), nullable=True),
        sa.Column("stadium", sa.String(length=120), nullable=True),
        sa.Column("api_spread", sa.Numeric(6, 2), nullable=True),
        sa.Column("api_total", sa.Numeric(6, 2), nullable=True),
    )
    op.create_index("ix_games_season", "games", ["season"])
    op.create_index("ix_games_week", "games", ["week"])
    op.create_index("ix_games_home_team", "games", ["home_team"])
    op.create_index("ix_games_away_team", "games", ["away_team"])

    op.create_table(
        "team_stats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("team", sa.String(length=8), nullable=False),
        sa.Column("season_type", sa.String(length=16), nullable=False),
        sa.Column("games", sa.Integer(), nullable=False),
        sa.Column("passing_yards", sa.Numeric(10, 1), nullable=False),
        sa.Column("rushing_yards", sa.Numeric(10, 1), nullable=False),
        sa.Column("receiving_yards", sa.Numeric(10, 1), nullable=False),
        sa.Column("first_downs", sa.Numeric(10, 1), nullable=False),
        sa.Column("sacks", sa.Numeric(8, 1), nullable=False),
        sa.Column("interceptions", sa.Numeric(8, 1), nullable=False),
        sa.Column("forced_fumbles", sa.Numeric(8, 1), nullable=False),
        sa.Column("tackles", sa.Numeric(8, 1), nullable=False),
        sa.Column("synced_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("season", "team", name="uq_team_stats_season_team"),
    )
    op.create_index("ix_team_stats_season", "team_stats", ["season"])
    op.create_index("ix_team_stats_team", "team_stats", ["team"])

    op.create_table(
        "slate_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("game_id", sa.String(length=40), sa.ForeignKey("games.game_id"), nullable=False),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("week", sa.Integer(), nullable=False),
        sa.Column("spread", sa.Numeric(6, 2), nullable=True),
        sa.Column("total", sa.Numeric(6, 2), nullable=True),
        sa.Column("odds_moneyline", sa.Numeric(8, 3), nullable=True),
        sa.Column("odds_total", sa.Numeric(8, 3), nullable=True),
        sa.Column("pick_ari", sa.String(length=40), nullable=True),
        sa.Column("pick_cabo", sa.String(length=40), nullable=True),
        sa.Column("pick_spread", sa.String(length=40), nullable=True),
        sa.Column("pick_sportsline", sa.String(length=40), nullable=True),
        sa.Column("pick_castle", sa.String(length=40), nullable=True),
        sa.Column("pick_alfredo", sa.String(length=40), nullable=True),
        sa.Column("injuries", sa.Text(), nullable=True),
        sa.Column("confirmed", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_slate_entries_game_id", "slate_entries", ["game_id"], unique=True)
    op.create_index("ix_slate_entries_season", "slate_entries", ["season"])
    op.create_index("ix_slate_entries_week", "slate_entries", ["week"])

    op.create_table(
        "bankroll_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_key", sa.String(length=40), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("odds", sa.Numeric(12, 4), nullable=False),
        sa.Column("stake", sa.Numeric(14, 2), nullable=True),
        sa.Column("note", sa.String(length=160), nullable=True),
    )
    op.create_index("ix_bankroll_lines_group_key", "bankroll_lines", ["group_key"])

    op.create_table(
        "sync_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("games_upserted", sa.Integer(), nullable=False),
        sa.Column("teams_upserted", sa.Integer(), nullable=False),
        sa.Column("ok", sa.Boolean(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("sync_logs")
    op.drop_table("bankroll_lines")
    op.drop_table("slate_entries")
    op.drop_table("team_stats")
    op.drop_table("games")
