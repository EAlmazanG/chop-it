from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, Date, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CHOP_IT_SCHEMA = "chop_it"


def _new_id() -> str:
    return str(uuid4())


def _now_utc() -> datetime:
    return datetime.now(UTC)


class IngredientSecondaryCategory(Base):
    __tablename__ = "ingredient_secondary_categories"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)


class User(Base):
    """The single local profile used by the standalone application."""

    __tablename__ = "users"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)


class Ingredient(Base):
    __tablename__ = "ingredients"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    created_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id"),
        nullable=False,
        index=True,
    )
    updated_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id"),
        nullable=False,
        index=True,
    )
    secondary_category_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.ingredient_secondary_categories.id"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    primary_macro_tag: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    unit: Mapped[str] = mapped_column(String(8), nullable=False)
    kcal_per_100: Mapped[float] = mapped_column(Float, nullable=False)
    protein_per_100: Mapped[float] = mapped_column(Float, nullable=False)
    fat_per_100: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_per_100: Mapped[float] = mapped_column(Float, nullable=False)
    is_oil: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    grams_per_spray: Mapped[float | None] = mapped_column(Float, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(nullable=True, index=True)


class Recipe(Base):
    __tablename__ = "recipes"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    created_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id"),
        nullable=False,
        index=True,
    )
    updated_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(4000), nullable=False, default="")
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    prep_time_minutes: Mapped[int] = mapped_column(nullable=False)
    servings: Mapped[int] = mapped_column(nullable=False)
    oil_mode: Mapped[str] = mapped_column(String(16), nullable=False)
    oil_sprays: Mapped[int | None] = mapped_column(nullable=True)
    oil_grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    total_protein: Mapped[float] = mapped_column(Float, nullable=False)
    total_fat: Mapped[float] = mapped_column(Float, nullable=False)
    total_carbs: Mapped[float] = mapped_column(Float, nullable=False)
    per_serving_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    per_serving_protein: Mapped[float] = mapped_column(Float, nullable=False)
    per_serving_fat: Mapped[float] = mapped_column(Float, nullable=False)
    per_serving_carbs: Mapped[float] = mapped_column(Float, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(nullable=True, index=True)


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    __table_args__ = (
        UniqueConstraint(
            "recipe_id",
            "ingredient_id",
            name="uq_chop_it_recipe_ingredients_recipe_ingredient",
        ),
        {"schema": CHOP_IT_SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    recipe_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.recipes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ingredient_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.ingredients.id"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)


class MealPlan(Base):
    __tablename__ = "meal_plans"
    __table_args__ = (
        UniqueConstraint("owner_user_id", "week_start", name="uq_chop_it_meal_plans_owner_week"),
        {"schema": CHOP_IT_SCHEMA},
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)


class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    meal_plan_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.meal_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meal_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    meal_slot: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    recipe_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.recipes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    servings: Mapped[float] = mapped_column(Float, nullable=False)


class ShoppingList(Base):
    __tablename__ = "shopping_lists"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"
    __table_args__ = {"schema": CHOP_IT_SCHEMA}

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(default=_now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=_now_utc,
        onupdate=_now_utc,
        nullable=False,
    )
    shopping_list_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.shopping_lists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ingredient_id: Mapped[str] = mapped_column(
        ForeignKey("chop_it.ingredients.id"),
        nullable=False,
        index=True,
    )
    section: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    required_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    pantry_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    final_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    is_checked: Mapped[bool] = mapped_column(nullable=False, default=False)
    source_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
