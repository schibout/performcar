"""add quote generator: dealerships, vehicle and service catalog, customers, quotes

Ports the data model of the PerformCar quote generator. Its own security tables
(sessions, login attempts, audit log, password history) are not recreated: the
existing ``user_session``, lockout and ``user_activity`` features cover them, and
its ``users.role`` is replaced by the RBAC roles ``dealer`` and
``dealer_network_admin``. Accounts are attached to a dealership through
``user.dealership_id``.

The vehicle and service catalog of the original database is seeded; dealerships,
customers and quotes are business data and are not.

Revision ID: f1a2b3c4d5e6
Revises: e7a3c15b9f20
Create Date: 2026-11-07 12:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: str | Sequence[str] | None = "e7a3c15b9f20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    """Return the creation and update timestamp columns."""
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


BRANDS = (
    "Audi", "BMW", "Mercedes", "Porsche", "Toyota", "Honda", "Ford", "Volkswagen",
    "Peugeot", "Renault", "Citroën", "Opel", "Nissan", "Mazda", "Hyundai", "Kia",
)  # fmt: skip
MODELS = {
    "Audi": ("A1", "A3", "A4", "A6", "Q3", "Q5", "Q7"),
    "BMW": ("Série 1", "Série 3", "Série 5", "X1", "X3", "X5"),
    "Mercedes": ("Classe A", "Classe C", "Classe E", "GLA", "GLC", "GLE"),
    "Porsche": ("911", "Cayenne", "Macan", "Panamera"),
}
VERSIONS = {
    ("Audi", "A3"): ("Sportback 1.0 TFSI", "Sportback 1.5 TFSI", "Sportback 2.0 TDI"),
    ("BMW", "Série 3"): ("320i", "330i", "320d"),
    ("Mercedes", "Classe C"): ("C180", "C200", "C220d"),
}
COLORS = (
    "Blanc", "Noir", "Gris", "Argent", "Bleu", "Rouge", "Vert", "Beige", "Marron",
    "Orange", "Jaune", "Violet",
)  # fmt: skip
CATEGORIES = (
    ("Financement", "FIN"),
    ("Assurance", "ASS"),
    ("Garantie", "GAR"),
    ("Entretien", "ENT"),
    ("Accessoires", "ACC"),
    ("Livraison", "LIV"),
    ("Formation", "FOR"),
)
SERVICES = (
    ("Financement personnalisé", "299.00", "FIN", "Montage de dossier de financement sur mesure"),
    ("Assurance tous risques", "850.00", "ASS", "Couverture complète du véhicule"),
    ("Garantie étendue 3 ans", "1200.00", "GAR", "Extension de garantie constructeur"),
    ("Pack entretien 5 ans", "890.00", "ENT", "Forfait entretien pour 5 années"),
    ("Tapis de sol premium", "149.00", "ACC", "Jeu complet de tapis sur mesure"),
    ("Livraison à domicile", "250.00", "LIV", "Livraison du véhicule au domicile"),
    ("Formation conduite éco", "180.00", "FOR", "Formation à la conduite économique"),
    ("Assurance vol/incendie", "450.00", "ASS", "Protection contre le vol et l incendie"),
    ("Kit mains libres Bluetooth", "299.00", "ACC", "Installation kit mains libres"),
    ("Vitres teintées", "380.00", "ACC", "Pose de films teintés réglementaires"),
)  # fmt: skip


def _create_tables() -> None:
    """Create the quote generator tables."""
    op.create_table(
        "dealership",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("logo_url", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("user", sa.Column("dealership_id", sa.Uuid(), nullable=True))
    op.create_index("ix_user_dealership_id", "user", ["dealership_id"])
    op.create_foreign_key(
        "fk_user_dealership_id",
        "user",
        "dealership",
        ["dealership_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "car_brand",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "car_model",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("brand_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["brand_id"], ["car_brand.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("brand_id", "name"),
    )
    op.create_index("ix_car_model_brand_id", "car_model", ["brand_id"])
    op.create_table(
        "car_version",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("model_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["model_id"], ["car_model.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", "name"),
    )
    op.create_index("ix_car_version_model_id", "car_version", ["model_id"])
    op.create_table(
        "car_color",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "service_category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "service",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["category_id"], ["service_category.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_service_category_id", "service", ["category_id"])

    op.create_table(
        "customer",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("dealership_id", sa.Uuid(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["dealership_id"], ["dealership.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customer_dealership_id", "customer", ["dealership_id"])

    op.create_table(
        "quote",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reference_number", sa.String(length=20), nullable=False),
        sa.Column("dealership_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("vehicle_brand", sa.String(length=50), nullable=False),
        sa.Column("vehicle_model", sa.String(length=100), nullable=False),
        sa.Column("vehicle_version", sa.String(length=100), nullable=True),
        sa.Column("vehicle_year", sa.Integer(), nullable=False),
        sa.Column("vehicle_color", sa.String(length=50), nullable=False),
        sa.Column("vehicle_condition", sa.String(length=10), nullable=False),
        sa.Column("financing_type", sa.String(length=20), nullable=True),
        sa.Column("financing_down_payment", sa.Numeric(10, 2), nullable=True),
        sa.Column("financing_duration_months", sa.Integer(), nullable=True),
        sa.Column("financing_monthly_payment", sa.Numeric(10, 2), nullable=True),
        sa.Column("requested_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        *_timestamps(),
        # OR-ed equalities rather than IN (...): PostgreSQL re-dumps them
        # identically after a reload (see database/tools/generate.py).
        sa.CheckConstraint(
            "(status = 'pending' OR status = 'confirmed' OR status = 'completed')",
            name="ck_quote_status",
        ),
        sa.CheckConstraint(
            "(vehicle_condition = 'new' OR vehicle_condition = 'used')",
            name="ck_quote_vehicle_condition",
        ),
        sa.CheckConstraint(
            "financing_type IS NULL OR (financing_type = 'cash' "
            "OR financing_type = 'credit' OR financing_type = 'leasing_loa' "
            "OR financing_type = 'leasing_lld')",
            name="ck_quote_financing_type",
        ),
        sa.ForeignKeyConstraint(
            ["dealership_id"], ["dealership.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["customer_id"], ["customer.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_number"),
    )
    op.create_index("ix_quote_dealership_id", "quote", ["dealership_id"])
    op.create_index("ix_quote_created_by_id", "quote", ["created_by_id"])
    op.create_index("ix_quote_customer_id", "quote", ["customer_id"])
    op.create_index("ix_quote_status", "quote", ["status"])
    op.create_index("ix_quote_created_at", "quote", ["created_at"])

    op.create_table(
        "quote_service",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quote_id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["quote_id"], ["quote.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["service.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("quote_id", "service_id"),
    )
    op.create_index("ix_quote_service_quote_id", "quote_service", ["quote_id"])
    op.create_index("ix_quote_service_service_id", "quote_service", ["service_id"])


def _seed_catalog() -> None:
    """Insert the vehicle and service catalog of the original quote generator."""
    now = datetime.now(UTC)
    stamp = {"created_at": now, "updated_at": now}

    def table(name: str, *columns: sa.Column) -> sa.TableClause:
        """Describe a table for bulk inserts."""
        return sa.table(
            name,
            sa.column("id", sa.Uuid()),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("updated_at", sa.DateTime(timezone=True)),
            *columns,
        )

    brand_ids = {name: uuid.uuid4() for name in BRANDS}
    op.bulk_insert(
        table("car_brand", sa.column("name", sa.String())),
        [{"id": brand_ids[name], "name": name, **stamp} for name in BRANDS],
    )
    model_ids: dict[tuple[str, str], uuid.UUID] = {}
    model_rows = []
    for brand, models in MODELS.items():
        for model in models:
            model_ids[(brand, model)] = uuid.uuid4()
            model_rows.append(
                {
                    "id": model_ids[(brand, model)],
                    "brand_id": brand_ids[brand],
                    "name": model,
                    **stamp,
                }
            )
    op.bulk_insert(
        table(
            "car_model",
            sa.column("brand_id", sa.Uuid()),
            sa.column("name", sa.String()),
        ),
        model_rows,
    )
    op.bulk_insert(
        table(
            "car_version",
            sa.column("model_id", sa.Uuid()),
            sa.column("name", sa.String()),
        ),
        [
            {"id": uuid.uuid4(), "model_id": model_ids[key], "name": name, **stamp}
            for key, names in VERSIONS.items()
            for name in names
        ],
    )
    op.bulk_insert(
        table("car_color", sa.column("name", sa.String())),
        [{"id": uuid.uuid4(), "name": name, **stamp} for name in COLORS],
    )
    category_ids = {code: uuid.uuid4() for _, code in CATEGORIES}
    op.bulk_insert(
        table(
            "service_category",
            sa.column("name", sa.String()),
            sa.column("code", sa.String()),
        ),
        [
            {"id": category_ids[code], "name": name, "code": code, **stamp}
            for name, code in CATEGORIES
        ],
    )
    op.bulk_insert(
        table(
            "service",
            sa.column("name", sa.String()),
            sa.column("price", sa.Numeric(10, 2)),
            sa.column("category_id", sa.Uuid()),
            sa.column("description", sa.Text()),
            sa.column("active", sa.Boolean()),
        ),
        [
            {
                "id": uuid.uuid4(),
                "name": name,
                "price": Decimal(price),
                "category_id": category_ids[code],
                "description": description,
                "active": True,
                **stamp,
            }
            for name, price, code, description in SERVICES
        ],
    )


def upgrade() -> None:
    """Create the quote generator tables and seed its catalog."""
    _create_tables()
    _seed_catalog()


def downgrade() -> None:
    """Drop the quote generator tables and the account's dealership link."""
    op.drop_table("quote_service")
    op.drop_table("quote")
    op.drop_table("customer")
    op.drop_table("service")
    op.drop_table("service_category")
    op.drop_table("car_color")
    op.drop_table("car_version")
    op.drop_table("car_model")
    op.drop_table("car_brand")
    op.drop_constraint("fk_user_dealership_id", "user", type_="foreignkey")
    op.drop_index("ix_user_dealership_id", table_name="user")
    op.drop_column("user", "dealership_id")
    op.drop_table("dealership")
