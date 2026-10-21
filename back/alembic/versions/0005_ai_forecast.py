"""cache the AI forecast for each game

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_forecasts",
        sa.Column("game_id", sa.String(length=40), primary_key=True),
        sa.Column("brief_hash", sa.String(length=64), nullable=False),
        sa.Column("win_away", sa.Integer(), nullable=False),
        sa.Column("win_home", sa.Integer(), nullable=False),
        sa.Column("score_away", sa.Integer(), nullable=False),
        sa.Column("score_home", sa.Integer(), nullable=False),
        sa.Column("over_prob", sa.Integer(), nullable=False),
        sa.Column("under_prob", sa.Integer(), nullable=False),
        sa.Column("margin", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("ai_forecasts")
