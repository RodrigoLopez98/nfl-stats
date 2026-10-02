"""special teams stats

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("team_stats", sa.Column("fg_made", sa.Numeric(8, 1), nullable=True))
    op.add_column("team_stats", sa.Column("fg_att", sa.Numeric(8, 1), nullable=True))
    op.add_column("team_stats", sa.Column("punt_return_yards", sa.Numeric(10, 1), nullable=True))
    op.add_column("team_stats", sa.Column("kickoff_return_yards", sa.Numeric(10, 1), nullable=True))
    op.add_column("team_stats", sa.Column("special_teams_tds", sa.Numeric(8, 1), nullable=True))


def downgrade() -> None:
    op.drop_column("team_stats", "special_teams_tds")
    op.drop_column("team_stats", "kickoff_return_yards")
    op.drop_column("team_stats", "punt_return_yards")
    op.drop_column("team_stats", "fg_att")
    op.drop_column("team_stats", "fg_made")
