"""city weather for every game

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("weather_c", sa.Numeric(4, 1), nullable=True))
    op.add_column("games", sa.Column("weather_precip", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("weather_wind", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("weather_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "weather_at")
    op.drop_column("games", "weather_wind")
    op.drop_column("games", "weather_precip")
    op.drop_column("games", "weather_c")
