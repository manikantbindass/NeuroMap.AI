"""Initial metadata schema. No raw image headers or plaintext credentials."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "datasets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("created", sa.Float, nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("details", sa.Text, nullable=False),
    )
    op.create_index("ix_datasets_created", "datasets", ["created"])
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("dataset_id", sa.String(36), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created", sa.Float, nullable=False),
        sa.Column("result", sa.Text, nullable=False),
        sa.Column("key", sa.String(80), unique=True, nullable=False),
    )
    for column in ["dataset_id", "status", "created"]:
        op.create_index(f"ix_jobs_{column}", "jobs", [column])
    op.create_table(
        "sessions",
        sa.Column("digest", sa.String(64), primary_key=True),
        sa.Column("expires", sa.Float, nullable=False),
    )
    op.create_index("ix_sessions_expires", "sessions", ["expires"])
    op.create_table(
        "audit",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created", sa.Float, nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("resource", sa.String(36), nullable=False),
    )


def downgrade():
    for table in ["audit", "sessions", "jobs", "datasets"]:
        op.drop_table(table)
