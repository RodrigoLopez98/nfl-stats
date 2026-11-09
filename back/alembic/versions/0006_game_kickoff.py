"""eastern kickoff clock for each game

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, Sequence[str], None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("games", sa.Column("gametime", sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column("games", "gametime")
