"""market lines, weather, rate stats, and injuries

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("roof", sa.String(24), nullable=True))
    op.add_column("games", sa.Column("temp", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("wind", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("away_moneyline", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("home_moneyline", sa.Integer(), nullable=True))
    op.add_column("team_stats", sa.Column("pass_attempts", sa.Numeric(10, 1), nullable=True))
    op.add_column("team_stats", sa.Column("rush_attempts", sa.Numeric(10, 1), nullable=True))
    op.add_column("team_stats", sa.Column("passing_epa", sa.Numeric(10, 2), nullable=True))
    op.add_column("team_stats", sa.Column("rushing_epa", sa.Numeric(10, 2), nullable=True))
    op.add_column("team_stats", sa.Column("qb_hits", sa.Numeric(8, 1), nullable=True))
    op.add_column("team_stats", sa.Column("giveaways", sa.Numeric(8, 1), nullable=True))
    op.create_table(
        "injury_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("season", sa.Integer(), nullable=False, index=True),
        sa.Column("team", sa.String(8), nullable=False, index=True),
        sa.Column("player", sa.String(80), nullable=False),
        sa.Column("position", sa.String(8), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("detail", sa.String(180), nullable=True),
        sa.UniqueConstraint("season", "team", "player", name="uq_injury_player"),
    )


def downgrade() -> None:
    op.drop_table("injury_reports")
    op.drop_column("team_stats", "giveaways")
    op.drop_column("team_stats", "qb_hits")
    op.drop_column("team_stats", "rushing_epa")
    op.drop_column("team_stats", "passing_epa")
    op.drop_column("team_stats", "rush_attempts")
    op.drop_column("team_stats", "pass_attempts")
    op.drop_column("games", "home_moneyline")
    op.drop_column("games", "away_moneyline")
    op.drop_column("games", "wind")
    op.drop_column("games", "temp")
    op.drop_column("games", "roof")
