"""Create the standalone Chop It schema.

Revision ID: 0001_initial
Revises:
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHOP_IT_SCHEMA = "chop_it"
DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"


def _schema() -> str | None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return None
    return CHOP_IT_SCHEMA


def _qualified(table_name: str) -> str:
    schema = _schema()
    return f"{schema}.{table_name}" if schema else table_name


def _users_table() -> str:
    return _qualified("users")


def upgrade() -> None:
    schema = _schema()
    if schema:
        op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    op.execute(
        sa.text(
            f"INSERT INTO {_users_table()} (id, created_at, display_name) "
            "VALUES (:id, CURRENT_TIMESTAMP, 'Demo cook')"
        ).bindparams(id=DEMO_USER_ID)
    )

    op.create_table(
        "ingredient_secondary_categories",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        schema=schema,
    )
    op.create_index(
        "ix_chop_it_ingredient_secondary_categories_name",
        "ingredient_secondary_categories",
        ["name"],
        schema=schema,
    )

    op.create_table(
        "ingredients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=False),
        sa.Column("updated_by_user_id", sa.String(length=36), nullable=False),
        sa.Column("secondary_category_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("primary_macro_tag", sa.String(length=32), nullable=False),
        sa.Column("unit", sa.String(length=8), nullable=False),
        sa.Column("kcal_per_100", sa.Float(), nullable=False),
        sa.Column("protein_per_100", sa.Float(), nullable=False),
        sa.Column("fat_per_100", sa.Float(), nullable=False),
        sa.Column("carbs_per_100", sa.Float(), nullable=False),
        sa.Column("is_oil", sa.Boolean(), nullable=False),
        sa.Column("grams_per_spray", sa.Float(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], [f"{_users_table()}.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], [f"{_users_table()}.id"]),
        sa.ForeignKeyConstraint(
            ["secondary_category_id"],
            [f"{_qualified('ingredient_secondary_categories')}.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        schema=schema,
    )
    for column in (
        "created_by_user_id",
        "updated_by_user_id",
        "secondary_category_id",
        "name",
        "primary_macro_tag",
        "archived_at",
    ):
        op.create_index(f"ix_chop_it_ingredients_{column}", "ingredients", [column], schema=schema)

    op.create_table(
        "recipes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=False),
        sa.Column("updated_by_user_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=4000), nullable=False),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=False),
        sa.Column("servings", sa.Integer(), nullable=False),
        sa.Column("oil_mode", sa.String(length=16), nullable=False),
        sa.Column("oil_sprays", sa.Integer(), nullable=True),
        sa.Column("oil_grams", sa.Float(), nullable=True),
        sa.Column("total_kcal", sa.Float(), nullable=False),
        sa.Column("total_protein", sa.Float(), nullable=False),
        sa.Column("total_fat", sa.Float(), nullable=False),
        sa.Column("total_carbs", sa.Float(), nullable=False),
        sa.Column("per_serving_kcal", sa.Float(), nullable=False),
        sa.Column("per_serving_protein", sa.Float(), nullable=False),
        sa.Column("per_serving_fat", sa.Float(), nullable=False),
        sa.Column("per_serving_carbs", sa.Float(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], [f"{_users_table()}.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], [f"{_users_table()}.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    for column in ("created_by_user_id", "updated_by_user_id", "title", "archived_at"):
        op.create_index(f"ix_chop_it_recipes_{column}", "recipes", [column], schema=schema)

    op.create_table(
        "recipe_ingredients",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("recipe_id", sa.String(length=36), nullable=False),
        sa.Column("ingredient_id", sa.String(length=36), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(
            ["recipe_id"],
            [f"{_qualified('recipes')}.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["ingredient_id"], [f"{_qualified('ingredients')}.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "recipe_id",
            "ingredient_id",
            name="uq_chop_it_recipe_ingredients_recipe_ingredient",
        ),
        schema=schema,
    )
    op.create_index(
        "ix_chop_it_recipe_ingredients_recipe_id",
        "recipe_ingredients",
        ["recipe_id"],
        schema=schema,
    )
    op.create_index(
        "ix_chop_it_recipe_ingredients_ingredient_id",
        "recipe_ingredients",
        ["ingredient_id"],
        schema=schema,
    )

    op.create_table(
        "meal_plans",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("owner_user_id", sa.String(length=36), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], [f"{_users_table()}.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_user_id", "week_start", name="uq_chop_it_meal_plans_owner_week"),
        schema=schema,
    )
    op.create_index(
        "ix_chop_it_meal_plans_owner_user_id", "meal_plans", ["owner_user_id"], schema=schema
    )
    op.create_index("ix_chop_it_meal_plans_week_start", "meal_plans", ["week_start"], schema=schema)

    op.create_table(
        "meal_plan_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("meal_plan_id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.String(length=36), nullable=False),
        sa.Column("meal_date", sa.Date(), nullable=False),
        sa.Column("meal_slot", sa.String(length=32), nullable=False),
        sa.Column("recipe_id", sa.String(length=36), nullable=False),
        sa.Column("servings", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(
            ["meal_plan_id"],
            [f"{_qualified('meal_plans')}.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], [f"{_users_table()}.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipe_id"], [f"{_qualified('recipes')}.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    for column in ("meal_plan_id", "owner_user_id", "meal_date", "meal_slot", "recipe_id"):
        op.create_index(
            f"ix_chop_it_meal_plan_items_{column}", "meal_plan_items", [column], schema=schema
        )

    op.create_table(
        "shopping_lists",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("owner_user_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_user_id"], [f"{_users_table()}.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    op.create_index(
        "ix_chop_it_shopping_lists_owner_user_id",
        "shopping_lists",
        ["owner_user_id"],
        schema=schema,
    )
    op.create_index("ix_chop_it_shopping_lists_status", "shopping_lists", ["status"], schema=schema)

    op.create_table(
        "shopping_list_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("shopping_list_id", sa.String(length=36), nullable=False),
        sa.Column("ingredient_id", sa.String(length=36), nullable=False),
        sa.Column("section", sa.String(length=32), nullable=False),
        sa.Column("required_quantity", sa.Float(), nullable=False),
        sa.Column("pantry_quantity", sa.Float(), nullable=False),
        sa.Column("final_quantity", sa.Float(), nullable=False),
        sa.Column("is_checked", sa.Boolean(), nullable=False),
        sa.Column("source_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["shopping_list_id"],
            [f"{_qualified('shopping_lists')}.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["ingredient_id"], [f"{_qualified('ingredients')}.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    for column in ("shopping_list_id", "ingredient_id", "section"):
        op.create_index(
            f"ix_chop_it_shopping_list_items_{column}",
            "shopping_list_items",
            [column],
            schema=schema,
        )


def downgrade() -> None:
    schema = _schema()
    for index_name in (
        "ix_chop_it_shopping_list_items_section",
        "ix_chop_it_shopping_list_items_ingredient_id",
        "ix_chop_it_shopping_list_items_shopping_list_id",
    ):
        op.drop_index(index_name, table_name="shopping_list_items", schema=schema)
    op.drop_table("shopping_list_items", schema=schema)
    op.drop_index("ix_chop_it_shopping_lists_status", table_name="shopping_lists", schema=schema)
    op.drop_index(
        "ix_chop_it_shopping_lists_owner_user_id", table_name="shopping_lists", schema=schema
    )
    op.drop_table("shopping_lists", schema=schema)
    for index_name in (
        "ix_chop_it_meal_plan_items_recipe_id",
        "ix_chop_it_meal_plan_items_meal_slot",
        "ix_chop_it_meal_plan_items_meal_date",
        "ix_chop_it_meal_plan_items_owner_user_id",
        "ix_chop_it_meal_plan_items_meal_plan_id",
    ):
        op.drop_index(index_name, table_name="meal_plan_items", schema=schema)
    op.drop_table("meal_plan_items", schema=schema)
    op.drop_index("ix_chop_it_meal_plans_week_start", table_name="meal_plans", schema=schema)
    op.drop_index("ix_chop_it_meal_plans_owner_user_id", table_name="meal_plans", schema=schema)
    op.drop_table("meal_plans", schema=schema)
    op.drop_index(
        "ix_chop_it_recipe_ingredients_ingredient_id",
        table_name="recipe_ingredients",
        schema=schema,
    )
    op.drop_index(
        "ix_chop_it_recipe_ingredients_recipe_id", table_name="recipe_ingredients", schema=schema
    )
    op.drop_table("recipe_ingredients", schema=schema)
    for index_name in (
        "ix_chop_it_recipes_archived_at",
        "ix_chop_it_recipes_title",
        "ix_chop_it_recipes_updated_by_user_id",
        "ix_chop_it_recipes_created_by_user_id",
    ):
        op.drop_index(index_name, table_name="recipes", schema=schema)
    op.drop_table("recipes", schema=schema)
    for index_name in (
        "ix_chop_it_ingredients_archived_at",
        "ix_chop_it_ingredients_primary_macro_tag",
        "ix_chop_it_ingredients_name",
        "ix_chop_it_ingredients_secondary_category_id",
        "ix_chop_it_ingredients_updated_by_user_id",
        "ix_chop_it_ingredients_created_by_user_id",
    ):
        op.drop_index(index_name, table_name="ingredients", schema=schema)
    op.drop_table("ingredients", schema=schema)
    op.drop_index(
        "ix_chop_it_ingredient_secondary_categories_name",
        table_name="ingredient_secondary_categories",
        schema=schema,
    )
    op.drop_table("ingredient_secondary_categories", schema=schema)
    op.drop_table("users", schema=schema)
    if schema:
        op.execute(sa.text(f"DROP SCHEMA IF EXISTS {schema}"))
