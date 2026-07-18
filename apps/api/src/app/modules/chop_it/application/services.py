from __future__ import annotations

from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.chop_it.infrastructure.models import (
    Ingredient,
    IngredientSecondaryCategory,
    MealPlanItem,
    Recipe,
    RecipeIngredient,
    ShoppingList,
    ShoppingListItem,
)
from app.modules.chop_it.infrastructure.repository import ChopItRepository, ShoppingListItemInput

SessionFactory = Callable[[], Iterator[Session]]


@dataclass(frozen=True)
class RecipeView:
    recipe: Recipe
    ingredients: list[RecipeIngredient]


@dataclass(frozen=True)
class MacroTotalsView:
    kcal: float
    protein: float
    fat: float
    carbs: float


@dataclass(frozen=True)
class MealPlanItemView:
    item: MealPlanItem
    recipe: Recipe
    totals: MacroTotalsView


@dataclass(frozen=True)
class MealPlanDayView:
    date: date
    totals: MacroTotalsView


@dataclass(frozen=True)
class MealPlanWeekView:
    owner_user_id: str
    week_start: date
    items: list[MealPlanItemView]
    days: list[MealPlanDayView]
    week_totals: MacroTotalsView


@dataclass(frozen=True)
class ShoppingListItemView:
    item: ShoppingListItem
    ingredient: Ingredient
    source_recipes: list[str]
    source_details: list[ShoppingListItemSourceDetail]


@dataclass(frozen=True)
class ShoppingListItemSourceDetail:
    recipe_title: str
    meal_date: date
    meal_slot: str
    servings: float
    quantity: float


@dataclass(frozen=True)
class ShoppingListView:
    shopping_list: ShoppingList
    items: list[ShoppingListItemView]


def _default_session_factory() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


class ChopItService:
    def __init__(self, session_factory: SessionFactory = _default_session_factory) -> None:
        self._session_factory = session_factory

    @contextmanager
    def _session_scope(self) -> Iterator[Session]:
        yield from self._session_factory()

    def list_categories(self) -> list[IngredientSecondaryCategory]:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            categories = repository.list_secondary_categories()
            for category in categories:
                session.expunge(category)
            session.commit()
            return categories

    def create_category(self, *, name: str) -> IngredientSecondaryCategory:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            category = repository.create_secondary_category(name=name)
            session.expunge(category)
            session.commit()
            return category

    def update_category(self, category_id: str, *, name: str) -> IngredientSecondaryCategory:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            category = repository.update_secondary_category(category_id, name=name)
            session.expunge(category)
            session.commit()
            return category

    def delete_category(self, category_id: str) -> None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            repository.delete_secondary_category(category_id)
            session.commit()

    def list_ingredients(self) -> list[Ingredient]:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            ingredients = repository.list_ingredients()
            for ingredient in ingredients:
                session.expunge(ingredient)
            session.commit()
            return ingredients

    def create_ingredient(
        self,
        *,
        name: str,
        primary_macro_tag: str,
        secondary_category_id: str,
        unit: str,
        kcal_per_100: float,
        protein_per_100: float,
        fat_per_100: float,
        carbs_per_100: float,
        actor_user_id: str,
        grams_per_spray: float | None = None,
    ) -> Ingredient:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            ingredient = repository.create_ingredient(
                name=name,
                primary_macro_tag=primary_macro_tag,
                secondary_category_id=secondary_category_id,
                unit=unit,
                kcal_per_100=kcal_per_100,
                protein_per_100=protein_per_100,
                fat_per_100=fat_per_100,
                carbs_per_100=carbs_per_100,
                grams_per_spray=grams_per_spray,
                actor_user_id=actor_user_id,
            )
            session.expunge(ingredient)
            session.commit()
            return ingredient

    def update_ingredient(
        self,
        ingredient_id: str,
        *,
        name: str,
        primary_macro_tag: str,
        secondary_category_id: str,
        unit: str,
        kcal_per_100: float,
        protein_per_100: float,
        fat_per_100: float,
        carbs_per_100: float,
        actor_user_id: str,
        grams_per_spray: float | None = None,
    ) -> Ingredient:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            ingredient = repository.update_ingredient(
                ingredient_id,
                name=name,
                primary_macro_tag=primary_macro_tag,
                secondary_category_id=secondary_category_id,
                unit=unit,
                kcal_per_100=kcal_per_100,
                protein_per_100=protein_per_100,
                fat_per_100=fat_per_100,
                carbs_per_100=carbs_per_100,
                grams_per_spray=grams_per_spray,
                actor_user_id=actor_user_id,
            )
            session.expunge(ingredient)
            session.commit()
            return ingredient

    def delete_ingredient(self, ingredient_id: str, *, actor_user_id: str) -> None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            repository.archive_ingredient(ingredient_id, actor_user_id=actor_user_id)
            session.commit()

    def list_recipes(self) -> list[RecipeView]:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            recipes = repository.list_recipes()
            recipe_views = [
                self._detach_recipe_view(session, repository, recipe) for recipe in recipes
            ]
            session.commit()
            return recipe_views

    def list_archived_recipes(self) -> list[RecipeView]:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            recipes = repository.list_archived_recipes()
            recipe_views = [
                self._detach_recipe_view(session, repository, recipe) for recipe in recipes
            ]
            session.commit()
            return recipe_views

    def create_recipe(
        self,
        *,
        title: str,
        description: str,
        image_url: str | None,
        prep_time_minutes: int,
        servings: int,
        oil_mode: str,
        oil_sprays: int | None,
        oil_grams: float | None,
        actor_user_id: str,
        ingredients: list[dict[str, str | float]],
    ) -> RecipeView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            recipe = repository.create_recipe(
                title=title,
                description=description,
                image_url=image_url,
                prep_time_minutes=prep_time_minutes,
                servings=servings,
                oil_mode=oil_mode,
                oil_sprays=oil_sprays,
                oil_grams=oil_grams,
                actor_user_id=actor_user_id,
                ingredients=[
                    {
                        "ingredient_id": str(ingredient["ingredient_id"]),
                        "quantity": float(ingredient["quantity"]),
                    }
                    for ingredient in ingredients
                ],
            )
            recipe_view = self._detach_recipe_view(session, repository, recipe)
            session.commit()
            return recipe_view

    def update_recipe(
        self,
        recipe_id: str,
        *,
        title: str,
        description: str,
        image_url: str | None,
        prep_time_minutes: int,
        servings: int,
        oil_mode: str,
        oil_sprays: int | None,
        oil_grams: float | None,
        actor_user_id: str,
        ingredients: list[dict[str, str | float]],
    ) -> RecipeView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            recipe = repository.update_recipe(
                recipe_id,
                title=title,
                description=description,
                image_url=image_url,
                prep_time_minutes=prep_time_minutes,
                servings=servings,
                oil_mode=oil_mode,
                oil_sprays=oil_sprays,
                oil_grams=oil_grams,
                actor_user_id=actor_user_id,
                ingredients=[
                    {
                        "ingredient_id": str(ingredient["ingredient_id"]),
                        "quantity": float(ingredient["quantity"]),
                    }
                    for ingredient in ingredients
                ],
            )
            recipe_view = self._detach_recipe_view(session, repository, recipe)
            session.commit()
            return recipe_view

    def delete_recipe(self, recipe_id: str, *, actor_user_id: str) -> None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            repository.archive_recipe(recipe_id, actor_user_id=actor_user_id)
            session.commit()

    def restore_recipe(self, recipe_id: str, *, actor_user_id: str) -> RecipeView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            recipe = repository.restore_recipe(recipe_id, actor_user_id=actor_user_id)
            recipe_view = self._detach_recipe_view(session, repository, recipe)
            session.commit()
            return recipe_view

    def delete_recipe_permanently(self, recipe_id: str) -> None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            repository.delete_recipe_permanently(recipe_id)
            session.commit()

    def create_meal_plan_item(
        self,
        *,
        owner_user_id: str,
        meal_date: date,
        meal_slot: str,
        recipe_id: str,
        servings: float,
    ) -> MealPlanItemView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            item = repository.upsert_meal_plan_item(
                owner_user_id=owner_user_id,
                meal_date=meal_date,
                meal_slot=meal_slot,
                recipe_id=recipe_id,
                servings=servings,
            )
            recipe = repository.get_recipe(recipe_id)
            item_view = self._detach_meal_plan_item_view(session, item, recipe)
            session.commit()
            return item_view

    def list_week_plan(self, *, owner_user_id: str, week_start: date) -> MealPlanWeekView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            items = repository.list_week_plan_items(
                owner_user_id=owner_user_id,
                week_start=week_start,
            )
            recipes = repository.recipes_by_id([item.recipe_id for item in items]) if items else {}
            item_views = [
                self._detach_meal_plan_item_view(session, item, recipes[item.recipe_id])
                for item in items
            ]
            week_view = _week_view(
                owner_user_id=owner_user_id,
                week_start=week_start,
                items=item_views,
            )
            session.commit()
            return week_view

    def delete_meal_plan_item(self, item_id: str, *, owner_user_id: str) -> None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            repository.delete_meal_plan_item(item_id, owner_user_id=owner_user_id)
            session.commit()

    def generate_shopping_list(
        self,
        *,
        owner_user_id: str,
        title: str,
        start_date: date,
        end_date: date,
        excluded_recipe_ids: list[str],
        excluded_plan_items: list[dict[str, str | float]],
        excluded_plan_item_ids: list[str],
        pantry_items: list[dict[str, str | float]],
    ) -> ShoppingListView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            plan_items = repository.list_plan_items_between(
                owner_user_id=owner_user_id,
                start_date=start_date,
                end_date=end_date,
            )
            shopping_list_items = _shopping_list_item_inputs(
                repository=repository,
                plan_items=plan_items,
                excluded_recipe_ids=set(excluded_recipe_ids),
                excluded_plan_item_servings={
                    str(item["plan_item_id"]): float(item["servings"])
                    for item in excluded_plan_items
                },
                excluded_plan_item_ids=set(excluded_plan_item_ids),
                pantry_quantities={
                    str(item["ingredient_id"]): float(item["quantity"]) for item in pantry_items
                },
            )
            shopping_list = repository.create_shopping_list(
                owner_user_id=owner_user_id,
                title=title,
                start_date=start_date,
                end_date=end_date,
                items=shopping_list_items,
            )
            shopping_list_view = self._detach_shopping_list_view(
                session,
                repository,
                shopping_list,
            )
            session.commit()
            return shopping_list_view

    def get_current_shopping_list(self, *, owner_user_id: str) -> ShoppingListView | None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            shopping_list = repository.get_current_shopping_list(owner_user_id=owner_user_id)
            if shopping_list is None:
                session.commit()
                return None
            shopping_list_view = self._detach_shopping_list_view(
                session,
                repository,
                shopping_list,
            )
            session.commit()
            return shopping_list_view

    def list_archived_shopping_lists(self, *, owner_user_id: str) -> list[ShoppingListView]:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            shopping_lists = repository.list_archived_shopping_lists(owner_user_id=owner_user_id)
            shopping_list_views = [
                self._detach_shopping_list_view(session, repository, shopping_list)
                for shopping_list in shopping_lists
            ]
            session.commit()
            return shopping_list_views

    def complete_shopping_list(
        self,
        shopping_list_id: str,
        *,
        owner_user_id: str,
    ) -> ShoppingListView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            shopping_list = repository.complete_shopping_list(
                shopping_list_id,
                owner_user_id=owner_user_id,
            )
            shopping_list_view = self._detach_shopping_list_view(
                session,
                repository,
                shopping_list,
            )
            session.commit()
            return shopping_list_view

    def recover_shopping_list(
        self,
        shopping_list_id: str,
        *,
        owner_user_id: str,
    ) -> ShoppingListView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            shopping_list = repository.recover_shopping_list(
                shopping_list_id,
                owner_user_id=owner_user_id,
            )
            shopping_list_view = self._detach_shopping_list_view(
                session,
                repository,
                shopping_list,
            )
            session.commit()
            return shopping_list_view

    def delete_shopping_list(self, shopping_list_id: str, *, owner_user_id: str) -> None:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            repository.delete_shopping_list(shopping_list_id, owner_user_id=owner_user_id)
            session.commit()

    def update_shopping_list_item_checked(
        self,
        item_id: str,
        *,
        owner_user_id: str,
        is_checked: bool,
    ) -> ShoppingListItemView:
        with self._session_scope() as session:
            repository = ChopItRepository(session)
            item = repository.update_shopping_list_item_checked(
                item_id,
                owner_user_id=owner_user_id,
                is_checked=is_checked,
            )
            ingredients = repository.ingredients_by_id([item.ingredient_id])
            item_view = ShoppingListItemView(
                item=item,
                ingredient=ingredients[item.ingredient_id],
                source_recipes=_source_recipe_titles(item.source_json),
                source_details=_source_recipe_details(item.source_json),
            )
            session.expunge(item)
            session.expunge(ingredients[item.ingredient_id])
            session.commit()
            return item_view

    def _detach_recipe_view(
        self,
        session: Session,
        repository: ChopItRepository,
        recipe: Recipe,
    ) -> RecipeView:
        recipe_ingredients = repository.list_recipe_ingredients(recipe.id)
        session.expunge(recipe)
        for recipe_ingredient in recipe_ingredients:
            session.expunge(recipe_ingredient)
        return RecipeView(recipe=recipe, ingredients=recipe_ingredients)

    def _detach_meal_plan_item_view(
        self,
        session: Session,
        item: MealPlanItem,
        recipe: Recipe,
    ) -> MealPlanItemView:
        session.expunge(item)
        if recipe in session:
            session.expunge(recipe)
        return MealPlanItemView(item=item, recipe=recipe, totals=_item_totals(item, recipe))

    def _detach_shopping_list_view(
        self,
        session: Session,
        repository: ChopItRepository,
        shopping_list: ShoppingList,
    ) -> ShoppingListView:
        items = repository.list_shopping_list_items(shopping_list.id)
        ingredients = (
            repository.ingredients_by_id([item.ingredient_id for item in items]) if items else {}
        )
        item_views = [
            ShoppingListItemView(
                item=item,
                ingredient=ingredients[item.ingredient_id],
                source_recipes=_source_recipe_titles(item.source_json),
                source_details=_source_recipe_details(item.source_json),
            )
            for item in items
        ]
        session.expunge(shopping_list)
        for item in items:
            session.expunge(item)
        for ingredient in ingredients.values():
            if ingredient in session:
                session.expunge(ingredient)
        return ShoppingListView(shopping_list=shopping_list, items=item_views)


def _week_view(
    *,
    owner_user_id: str,
    week_start: date,
    items: list[MealPlanItemView],
) -> MealPlanWeekView:
    days: list[MealPlanDayView] = []
    week_totals = MacroTotalsView(kcal=0, protein=0, fat=0, carbs=0)
    for day_offset in range(7):
        day = date.fromordinal(week_start.toordinal() + day_offset)
        day_totals = _sum_totals([item.totals for item in items if item.item.meal_date == day])
        days.append(MealPlanDayView(date=day, totals=day_totals))
        week_totals = _add_totals(week_totals, day_totals)
    return MealPlanWeekView(
        owner_user_id=owner_user_id,
        week_start=week_start,
        items=items,
        days=days,
        week_totals=week_totals,
    )


def _item_totals(item: MealPlanItem, recipe: Recipe) -> MacroTotalsView:
    return MacroTotalsView(
        kcal=recipe.per_serving_kcal * item.servings,
        protein=recipe.per_serving_protein * item.servings,
        fat=recipe.per_serving_fat * item.servings,
        carbs=recipe.per_serving_carbs * item.servings,
    )


def _sum_totals(totals: list[MacroTotalsView]) -> MacroTotalsView:
    result = MacroTotalsView(kcal=0, protein=0, fat=0, carbs=0)
    for total in totals:
        result = _add_totals(result, total)
    return result


def _add_totals(left: MacroTotalsView, right: MacroTotalsView) -> MacroTotalsView:
    return MacroTotalsView(
        kcal=left.kcal + right.kcal,
        protein=left.protein + right.protein,
        fat=left.fat + right.fat,
        carbs=left.carbs + right.carbs,
    )


def _shopping_list_item_inputs(
    *,
    repository: ChopItRepository,
    plan_items: list[MealPlanItem],
    excluded_recipe_ids: set[str],
    excluded_plan_item_servings: dict[str, float],
    excluded_plan_item_ids: set[str],
    pantry_quantities: dict[str, float],
) -> list[ShoppingListItemInput]:
    if not plan_items:
        return []

    recipes = repository.recipes_by_id([item.recipe_id for item in plan_items])
    required_quantities: dict[str, float] = {}
    source_recipes: dict[str, set[str]] = {}
    source_details: dict[str, list[dict[str, object]]] = {}
    excluded_quantities: dict[str, float] = {}
    excluded_source_recipes: dict[str, set[str]] = {}
    excluded_source_details: dict[str, list[dict[str, object]]] = {}

    for plan_item in plan_items:
        recipe = recipes[plan_item.recipe_id]
        excluded_servings = _excluded_servings_for_plan_item(
            plan_item=plan_item,
            recipe_id=recipe.id,
            excluded_recipe_ids=excluded_recipe_ids,
            excluded_plan_item_ids=excluded_plan_item_ids,
            excluded_plan_item_servings=excluded_plan_item_servings,
        )
        included_servings = max(plan_item.servings - excluded_servings, 0)
        for recipe_ingredient in repository.list_recipe_ingredients(recipe.id):
            if included_servings > 0:
                _add_shopping_source_quantity(
                    detail_servings=included_servings,
                    ingredient_id=recipe_ingredient.ingredient_id,
                    meal_date=plan_item.meal_date,
                    meal_slot=plan_item.meal_slot,
                    quantity=(recipe_ingredient.quantity / recipe.servings) * included_servings,
                    recipe_title=recipe.title,
                    source_details=source_details,
                    source_recipes=source_recipes,
                    target_quantities=required_quantities,
                )
            if excluded_servings > 0:
                _add_shopping_source_quantity(
                    detail_servings=excluded_servings,
                    ingredient_id=recipe_ingredient.ingredient_id,
                    meal_date=plan_item.meal_date,
                    meal_slot=plan_item.meal_slot,
                    quantity=(recipe_ingredient.quantity / recipe.servings) * excluded_servings,
                    recipe_title=recipe.title,
                    source_details=excluded_source_details,
                    source_recipes=excluded_source_recipes,
                    target_quantities=excluded_quantities,
                )

    included_items: list[ShoppingListItemInput] = []
    for ingredient_id, required in sorted(required_quantities.items()):
        section = _shopping_list_section(required, pantry_quantities, ingredient_id)
        included_items.append(
            {
                "ingredient_id": ingredient_id,
                "section": section,
                "required_quantity": required,
                "pantry_quantity": min(pantry_quantities.get(ingredient_id, 0), required),
                "final_quantity": _final_quantity(required, pantry_quantities, ingredient_id),
                "is_checked": section == "pantry",
                "source_json": {
                    "recipe_titles": sorted(source_recipes.get(ingredient_id, set())),
                    "details": source_details.get(ingredient_id, []),
                },
            }
        )
    excluded_items: list[ShoppingListItemInput] = [
        {
            "ingredient_id": ingredient_id,
            "section": "recipe_excluded",
            "required_quantity": required,
            "pantry_quantity": 0,
            "final_quantity": required,
            "is_checked": True,
            "source_json": {
                "recipe_titles": sorted(excluded_source_recipes.get(ingredient_id, set())),
                "details": excluded_source_details.get(ingredient_id, []),
            },
        }
        for ingredient_id, required in sorted(excluded_quantities.items())
    ]
    return included_items + excluded_items


def _excluded_servings_for_plan_item(
    *,
    plan_item: MealPlanItem,
    recipe_id: str,
    excluded_recipe_ids: set[str],
    excluded_plan_item_ids: set[str],
    excluded_plan_item_servings: dict[str, float],
) -> float:
    if plan_item.id in excluded_plan_item_servings:
        return min(max(excluded_plan_item_servings[plan_item.id], 0), plan_item.servings)
    if plan_item.id in excluded_plan_item_ids:
        return plan_item.servings
    if (
        not excluded_plan_item_ids
        and not excluded_plan_item_servings
        and recipe_id in excluded_recipe_ids
    ):
        return plan_item.servings
    return 0


def _add_shopping_source_quantity(
    *,
    detail_servings: float,
    ingredient_id: str,
    meal_date: date,
    meal_slot: str,
    quantity: float,
    recipe_title: str,
    source_details: dict[str, list[dict[str, object]]],
    source_recipes: dict[str, set[str]],
    target_quantities: dict[str, float],
) -> None:
    target_quantities[ingredient_id] = target_quantities.get(ingredient_id, 0) + quantity
    source_recipes.setdefault(ingredient_id, set()).add(recipe_title)
    source_details.setdefault(ingredient_id, []).append(
        {
            "recipe_title": recipe_title,
            "meal_date": meal_date.isoformat(),
            "meal_slot": meal_slot,
            "servings": detail_servings,
            "quantity": quantity,
        }
    )


def _final_quantity(
    required_quantity: float,
    pantry_quantities: dict[str, float],
    ingredient_id: str,
) -> float:
    return max(required_quantity - pantry_quantities.get(ingredient_id, 0), 0)


def _shopping_list_section(
    required_quantity: float,
    pantry_quantities: dict[str, float],
    ingredient_id: str,
) -> str:
    if _final_quantity(required_quantity, pantry_quantities, ingredient_id) == 0:
        return "pantry"
    return "missing"


def _source_recipe_titles(source_json: dict[str, object]) -> list[str]:
    recipe_titles = source_json.get("recipe_titles", [])
    if not isinstance(recipe_titles, list):
        return []
    return [str(recipe_title) for recipe_title in recipe_titles]


def _source_recipe_details(source_json: dict[str, object]) -> list[ShoppingListItemSourceDetail]:
    details = source_json.get("details", [])
    if not isinstance(details, list):
        return []
    parsed_details: list[ShoppingListItemSourceDetail] = []
    for detail in details:
        if not isinstance(detail, dict):
            continue
        try:
            meal_date = date.fromisoformat(str(detail.get("meal_date", "")))
        except ValueError:
            continue
        parsed_details.append(
            ShoppingListItemSourceDetail(
                recipe_title=str(detail.get("recipe_title", "")),
                meal_date=meal_date,
                meal_slot=str(detail.get("meal_slot", "")),
                servings=float(detail.get("servings", 1)),
                quantity=float(detail.get("quantity", 0)),
            )
        )
    return parsed_details
