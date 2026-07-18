from __future__ import annotations

from datetime import date
from typing import TypedDict

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.chop_it.domain.models import (
    IngredientNutrition,
    OilMode,
    RecipeNutrition,
    RecipeNutritionInput,
    calculate_recipe_nutrition,
)
from app.modules.chop_it.domain.models import (
    RecipeIngredient as DomainRecipeIngredient,
)
from app.modules.chop_it.infrastructure.models import (
    Ingredient,
    IngredientSecondaryCategory,
    MealPlan,
    MealPlanItem,
    Recipe,
    RecipeIngredient,
    ShoppingList,
    ShoppingListItem,
    _now_utc,
)


class RecipeIngredientInput(TypedDict):
    ingredient_id: str
    quantity: float


class ShoppingListItemInput(TypedDict):
    ingredient_id: str
    section: str
    required_quantity: float
    pantry_quantity: float
    final_quantity: float
    is_checked: bool
    source_json: dict[str, object]


class ChopItRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_secondary_category(self, *, name: str) -> IngredientSecondaryCategory:
        category = IngredientSecondaryCategory(name=name.strip())
        self._session.add(category)
        self._session.flush()
        return category

    def list_secondary_categories(self) -> list[IngredientSecondaryCategory]:
        statement = select(IngredientSecondaryCategory).order_by(IngredientSecondaryCategory.name)
        return list(self._session.scalars(statement).all())

    def update_secondary_category(
        self,
        category_id: str,
        *,
        name: str,
    ) -> IngredientSecondaryCategory:
        category = self._require_secondary_category(category_id)
        category.name = name.strip()
        self._session.flush()
        return category

    def delete_secondary_category(self, category_id: str) -> None:
        category = self._require_secondary_category(category_id)
        has_ingredients = (
            self._session.scalars(
                select(Ingredient.id).where(Ingredient.secondary_category_id == category_id)
            ).first()
            is not None
        )
        if has_ingredients:
            raise ValueError("Ingredient category is used by ingredients")
        self._session.delete(category)
        self._session.flush()

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
        self._require_secondary_category(secondary_category_id)
        is_oil = _is_oil_name(name)
        oil_grams_per_spray = grams_per_spray if grams_per_spray is not None else 1
        ingredient = Ingredient(
            name=name.strip(),
            primary_macro_tag=primary_macro_tag,
            secondary_category_id=secondary_category_id,
            unit=unit,
            kcal_per_100=kcal_per_100,
            protein_per_100=protein_per_100,
            fat_per_100=fat_per_100,
            carbs_per_100=carbs_per_100,
            grams_per_spray=oil_grams_per_spray if is_oil else None,
            is_oil=is_oil,
            created_by_user_id=actor_user_id,
            updated_by_user_id=actor_user_id,
        )
        self._session.add(ingredient)
        self._session.flush()
        return ingredient

    def list_ingredients(self) -> list[Ingredient]:
        statement = (
            select(Ingredient)
            .where(Ingredient.archived_at.is_(None))
            .order_by(Ingredient.name, Ingredient.created_at)
        )
        return list(self._session.scalars(statement).all())

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
        ingredient = self._require_ingredient(ingredient_id)
        self._require_secondary_category(secondary_category_id)
        ingredient.name = name.strip()
        ingredient.primary_macro_tag = primary_macro_tag
        ingredient.secondary_category_id = secondary_category_id
        ingredient.unit = unit
        ingredient.kcal_per_100 = kcal_per_100
        ingredient.protein_per_100 = protein_per_100
        ingredient.fat_per_100 = fat_per_100
        ingredient.carbs_per_100 = carbs_per_100
        if ingredient.is_oil:
            ingredient.grams_per_spray = grams_per_spray if grams_per_spray is not None else 1
            self._recalculate_oil_recipes()
        else:
            ingredient.grams_per_spray = None
        ingredient.updated_by_user_id = actor_user_id
        self._session.flush()
        return ingredient

    def archive_ingredient(self, ingredient_id: str, *, actor_user_id: str) -> Ingredient:
        ingredient = self._require_ingredient(ingredient_id)
        if ingredient.is_oil:
            raise ValueError("Oil ingredient cannot be archived")
        ingredient.archived_at = _now_utc()
        ingredient.updated_by_user_id = actor_user_id
        self._session.flush()
        return ingredient

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
        ingredients: list[RecipeIngredientInput],
    ) -> Recipe:
        nutrition = self._calculate_recipe_nutrition(
            ingredients=ingredients,
            servings=servings,
            oil_mode=oil_mode,
            oil_sprays=oil_sprays,
            oil_grams=oil_grams,
        )
        recipe = Recipe(
            title=title.strip(),
            description=description,
            image_url=image_url,
            prep_time_minutes=prep_time_minutes,
            servings=servings,
            oil_mode=oil_mode,
            oil_sprays=oil_sprays,
            oil_grams=oil_grams,
            total_kcal=nutrition.total.kcal,
            total_protein=nutrition.total.protein,
            total_fat=nutrition.total.fat,
            total_carbs=nutrition.total.carbs,
            per_serving_kcal=nutrition.per_serving.kcal,
            per_serving_protein=nutrition.per_serving.protein,
            per_serving_fat=nutrition.per_serving.fat,
            per_serving_carbs=nutrition.per_serving.carbs,
            created_by_user_id=actor_user_id,
            updated_by_user_id=actor_user_id,
        )
        self._session.add(recipe)
        self._session.flush()
        self._session.add_all(
            [
                RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_id=item["ingredient_id"],
                    quantity=item["quantity"],
                )
                for item in ingredients
            ]
        )
        self._session.flush()
        return recipe

    def list_recipes(self) -> list[Recipe]:
        statement = (
            select(Recipe)
            .where(Recipe.archived_at.is_(None))
            .order_by(Recipe.title, Recipe.created_at)
        )
        return list(self._session.scalars(statement).all())

    def list_recipe_ingredients(self, recipe_id: str) -> list[RecipeIngredient]:
        statement = (
            select(RecipeIngredient)
            .where(RecipeIngredient.recipe_id == recipe_id)
            .order_by(RecipeIngredient.created_at)
        )
        return list(self._session.scalars(statement).all())

    def list_archived_recipes(self) -> list[Recipe]:
        statement = (
            select(Recipe)
            .where(Recipe.archived_at.is_not(None))
            .order_by(Recipe.title, Recipe.created_at)
        )
        return list(self._session.scalars(statement).all())

    def get_recipe(self, recipe_id: str) -> Recipe:
        return self._require_recipe(recipe_id)

    def recipes_by_id(self, recipe_ids: list[str]) -> dict[str, Recipe]:
        statement = select(Recipe).where(Recipe.id.in_(recipe_ids))
        recipes = {recipe.id: recipe for recipe in self._session.scalars(statement)}
        missing = set(recipe_ids) - set(recipes)
        if missing:
            raise ValueError(f"Recipes not found: {sorted(missing)}")
        return recipes

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
        ingredients: list[RecipeIngredientInput],
    ) -> Recipe:
        recipe = self._require_recipe(recipe_id)
        nutrition = self._calculate_recipe_nutrition(
            ingredients=ingredients,
            servings=servings,
            oil_mode=oil_mode,
            oil_sprays=oil_sprays,
            oil_grams=oil_grams,
        )
        recipe.title = title.strip()
        recipe.description = description
        recipe.image_url = image_url
        recipe.prep_time_minutes = prep_time_minutes
        recipe.servings = servings
        recipe.oil_mode = oil_mode
        recipe.oil_sprays = oil_sprays
        recipe.oil_grams = oil_grams
        recipe.total_kcal = nutrition.total.kcal
        recipe.total_protein = nutrition.total.protein
        recipe.total_fat = nutrition.total.fat
        recipe.total_carbs = nutrition.total.carbs
        recipe.per_serving_kcal = nutrition.per_serving.kcal
        recipe.per_serving_protein = nutrition.per_serving.protein
        recipe.per_serving_fat = nutrition.per_serving.fat
        recipe.per_serving_carbs = nutrition.per_serving.carbs
        recipe.updated_by_user_id = actor_user_id
        self._session.execute(
            delete(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
        )
        self._session.flush()
        self._session.add_all(
            [
                RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_id=item["ingredient_id"],
                    quantity=item["quantity"],
                )
                for item in ingredients
            ]
        )
        self._session.flush()
        return recipe

    def archive_recipe(self, recipe_id: str, *, actor_user_id: str) -> Recipe:
        recipe = self._require_recipe(recipe_id)
        recipe.archived_at = _now_utc()
        recipe.updated_by_user_id = actor_user_id
        self._session.execute(delete(MealPlanItem).where(MealPlanItem.recipe_id == recipe_id))
        self._session.flush()
        return recipe

    def restore_recipe(self, recipe_id: str, *, actor_user_id: str) -> Recipe:
        recipe = self._require_recipe(recipe_id)
        recipe.archived_at = None
        recipe.updated_by_user_id = actor_user_id
        self._session.flush()
        return recipe

    def delete_recipe_permanently(self, recipe_id: str) -> None:
        recipe = self._require_recipe(recipe_id)
        self._session.delete(recipe)
        self._session.flush()

    def upsert_meal_plan_item(
        self,
        *,
        owner_user_id: str,
        meal_date: str | date,
        meal_slot: str,
        recipe_id: str,
        servings: float,
    ) -> MealPlanItem:
        self._require_recipe(recipe_id)
        parsed_meal_date = _parse_date(meal_date)
        week_start = _week_start(parsed_meal_date)
        meal_plan = self._get_or_create_meal_plan(owner_user_id, week_start)
        item = MealPlanItem(
            meal_plan_id=meal_plan.id,
            owner_user_id=owner_user_id,
            meal_date=parsed_meal_date,
            meal_slot=meal_slot,
            recipe_id=recipe_id,
            servings=servings,
        )
        self._session.add(item)
        self._session.flush()
        return item

    def list_week_plan_items(
        self,
        *,
        owner_user_id: str,
        week_start: str | date,
    ) -> list[MealPlanItem]:
        start_date = _parse_date(week_start)
        end_date = date.fromordinal(start_date.toordinal() + 6)
        statement = (
            select(MealPlanItem)
            .where(
                MealPlanItem.owner_user_id == owner_user_id,
                MealPlanItem.meal_date >= start_date,
                MealPlanItem.meal_date <= end_date,
            )
            .order_by(MealPlanItem.meal_date, MealPlanItem.meal_slot, MealPlanItem.created_at)
        )
        return list(self._session.scalars(statement).all())

    def list_plan_items_between(
        self,
        *,
        owner_user_id: str,
        start_date: str | date,
        end_date: str | date,
    ) -> list[MealPlanItem]:
        parsed_start = _parse_date(start_date)
        parsed_end = _parse_date(end_date)
        statement = (
            select(MealPlanItem)
            .where(
                MealPlanItem.owner_user_id == owner_user_id,
                MealPlanItem.meal_date >= parsed_start,
                MealPlanItem.meal_date <= parsed_end,
            )
            .order_by(MealPlanItem.meal_date, MealPlanItem.meal_slot, MealPlanItem.created_at)
        )
        return list(self._session.scalars(statement).all())

    def delete_meal_plan_item(self, item_id: str, *, owner_user_id: str) -> None:
        item = self._session.get(MealPlanItem, item_id)
        if item is None or item.owner_user_id != owner_user_id:
            raise ValueError("Meal plan item not found")
        self._session.delete(item)
        self._session.flush()

    def create_shopping_list(
        self,
        *,
        owner_user_id: str,
        title: str,
        start_date: str | date,
        end_date: str | date,
        items: list[ShoppingListItemInput],
    ) -> ShoppingList:
        self._archive_current_lists(owner_user_id)
        shopping_list = ShoppingList(
            owner_user_id=owner_user_id,
            title=title,
            start_date=_parse_date(start_date),
            end_date=_parse_date(end_date),
            status="current",
        )
        self._session.add(shopping_list)
        self._session.flush()
        self._session.add_all(
            [
                ShoppingListItem(
                    shopping_list_id=shopping_list.id,
                    ingredient_id=item["ingredient_id"],
                    section=item["section"],
                    required_quantity=item["required_quantity"],
                    pantry_quantity=item["pantry_quantity"],
                    final_quantity=item["final_quantity"],
                    is_checked=item["is_checked"],
                    source_json=item["source_json"],
                )
                for item in items
            ]
        )
        self._session.flush()
        return shopping_list

    def get_current_shopping_list(self, *, owner_user_id: str) -> ShoppingList | None:
        statement = (
            select(ShoppingList)
            .where(
                ShoppingList.owner_user_id == owner_user_id,
                ShoppingList.status == "current",
            )
            .order_by(ShoppingList.created_at.desc())
        )
        return self._session.scalars(statement).first()

    def list_archived_shopping_lists(self, *, owner_user_id: str) -> list[ShoppingList]:
        statement = (
            select(ShoppingList)
            .where(
                ShoppingList.owner_user_id == owner_user_id,
                ShoppingList.status == "archived",
            )
            .order_by(ShoppingList.updated_at.desc())
        )
        return list(self._session.scalars(statement).all())

    def list_shopping_list_items(self, shopping_list_id: str) -> list[ShoppingListItem]:
        statement = (
            select(ShoppingListItem)
            .where(ShoppingListItem.shopping_list_id == shopping_list_id)
            .order_by(ShoppingListItem.section, ShoppingListItem.created_at)
        )
        return list(self._session.scalars(statement).all())

    def complete_shopping_list(self, shopping_list_id: str, *, owner_user_id: str) -> ShoppingList:
        shopping_list = self._require_shopping_list(shopping_list_id)
        self._require_shopping_list_owner(shopping_list, owner_user_id)
        items = self.list_shopping_list_items(shopping_list.id)
        for item in items:
            item.is_checked = True
            if item.section == "missing":
                item.section = "bought"
        shopping_list.status = "archived"
        shopping_list.completed_at = _now_utc()
        self._session.flush()
        return shopping_list

    def recover_shopping_list(self, shopping_list_id: str, *, owner_user_id: str) -> ShoppingList:
        shopping_list = self._require_shopping_list(shopping_list_id)
        self._require_shopping_list_owner(shopping_list, owner_user_id)
        if shopping_list.completed_at is not None:
            raise ValueError("Completed shopping lists cannot be recovered")
        self._archive_current_lists(shopping_list.owner_user_id)
        shopping_list.status = "current"
        shopping_list.completed_at = None
        self._session.flush()
        return shopping_list

    def delete_shopping_list(self, shopping_list_id: str, *, owner_user_id: str) -> None:
        shopping_list = self._require_shopping_list(shopping_list_id)
        self._require_shopping_list_owner(shopping_list, owner_user_id)
        self._session.execute(
            delete(ShoppingListItem).where(ShoppingListItem.shopping_list_id == shopping_list.id)
        )
        self._session.delete(shopping_list)
        self._session.flush()

    def update_shopping_list_item_checked(
        self,
        item_id: str,
        *,
        owner_user_id: str,
        is_checked: bool,
    ) -> ShoppingListItem:
        item = self._require_shopping_list_item(item_id)
        shopping_list = self._require_shopping_list(item.shopping_list_id)
        self._require_shopping_list_owner(shopping_list, owner_user_id)
        if shopping_list.completed_at is not None:
            raise ValueError("Completed shopping lists cannot be modified")
        if item.section in {"pantry", "recipe_excluded"}:
            if not is_checked:
                raise ValueError("Pantry and excluded recipe items cannot be unchecked")
            item.is_checked = True
        elif item.section in {"missing", "bought"}:
            item.is_checked = is_checked
            item.section = "bought" if is_checked else "missing"
        else:
            item.is_checked = is_checked
        self._session.flush()
        return item

    def ingredients_by_id(self, ingredient_ids: list[str]) -> dict[str, Ingredient]:
        return self._ingredients_by_id(ingredient_ids)

    def _ingredients_by_id(self, ingredient_ids: list[str]) -> dict[str, Ingredient]:
        statement = select(Ingredient).where(Ingredient.id.in_(ingredient_ids))
        ingredients = {ingredient.id: ingredient for ingredient in self._session.scalars(statement)}
        missing = set(ingredient_ids) - set(ingredients)
        if missing:
            raise ValueError(f"Ingredients not found: {sorted(missing)}")
        return ingredients

    def _calculate_recipe_nutrition(
        self,
        *,
        ingredients: list[RecipeIngredientInput],
        servings: int,
        oil_mode: str,
        oil_sprays: int | None,
        oil_grams: float | None,
    ) -> RecipeNutrition:
        ingredient_records = self._ingredients_by_id(
            [ingredient["ingredient_id"] for ingredient in ingredients]
        )
        oil_ingredient = self._oil_ingredient()
        oil_nutrition = (
            IngredientNutrition(
                kcal_per_100=oil_ingredient.kcal_per_100,
                protein_per_100=oil_ingredient.protein_per_100,
                fat_per_100=oil_ingredient.fat_per_100,
                carbs_per_100=oil_ingredient.carbs_per_100,
            )
            if oil_ingredient
            else IngredientNutrition(
                kcal_per_100=900,
                protein_per_100=0,
                fat_per_100=100,
                carbs_per_100=0,
            )
        )
        return calculate_recipe_nutrition(
            RecipeNutritionInput(
                ingredients=[
                    DomainRecipeIngredient(
                        nutrition=IngredientNutrition(
                            kcal_per_100=ingredient_records[item["ingredient_id"]].kcal_per_100,
                            protein_per_100=ingredient_records[
                                item["ingredient_id"]
                            ].protein_per_100,
                            fat_per_100=ingredient_records[item["ingredient_id"]].fat_per_100,
                            carbs_per_100=ingredient_records[item["ingredient_id"]].carbs_per_100,
                        ),
                        quantity=item["quantity"],
                    )
                    for item in ingredients
                ],
                servings=servings,
                oil_mode=OilMode(oil_mode),
                oil_sprays=oil_sprays,
                oil_grams=oil_grams,
                oil_nutrition=oil_nutrition,
                oil_grams_per_spray=oil_ingredient.grams_per_spray
                if oil_ingredient and oil_ingredient.grams_per_spray
                else 1,
            )
        )

    def _oil_ingredient(self) -> Ingredient | None:
        statement = (
            select(Ingredient)
            .where(Ingredient.archived_at.is_(None), Ingredient.is_oil.is_(True))
            .order_by(Ingredient.name, Ingredient.created_at)
        )
        return self._session.scalars(statement).first()

    def _recalculate_oil_recipes(self) -> None:
        statement = select(Recipe).where(Recipe.oil_mode != OilMode.NONE.value)
        for recipe in self._session.scalars(statement):
            ingredients = [
                RecipeIngredientInput(
                    ingredient_id=recipe_ingredient.ingredient_id,
                    quantity=recipe_ingredient.quantity,
                )
                for recipe_ingredient in self._session.scalars(
                    select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe.id)
                )
            ]
            nutrition = self._calculate_recipe_nutrition(
                ingredients=ingredients,
                servings=recipe.servings,
                oil_mode=recipe.oil_mode,
                oil_sprays=recipe.oil_sprays,
                oil_grams=recipe.oil_grams,
            )
            recipe.total_kcal = nutrition.total.kcal
            recipe.total_protein = nutrition.total.protein
            recipe.total_fat = nutrition.total.fat
            recipe.total_carbs = nutrition.total.carbs
            recipe.per_serving_kcal = nutrition.per_serving.kcal
            recipe.per_serving_protein = nutrition.per_serving.protein
            recipe.per_serving_fat = nutrition.per_serving.fat
            recipe.per_serving_carbs = nutrition.per_serving.carbs

    def _require_secondary_category(self, category_id: str) -> IngredientSecondaryCategory:
        category = self._session.get(IngredientSecondaryCategory, category_id)
        if category is None:
            raise ValueError("Ingredient category not found")
        return category

    def _require_ingredient(self, ingredient_id: str) -> Ingredient:
        ingredient = self._session.get(Ingredient, ingredient_id)
        if ingredient is None:
            raise ValueError("Ingredient not found")
        return ingredient

    def _require_recipe(self, recipe_id: str) -> Recipe:
        recipe = self._session.get(Recipe, recipe_id)
        if recipe is None:
            raise ValueError("Recipe not found")
        return recipe

    def _require_shopping_list(self, shopping_list_id: str) -> ShoppingList:
        shopping_list = self._session.get(ShoppingList, shopping_list_id)
        if shopping_list is None:
            raise ValueError("Shopping list not found")
        return shopping_list

    @staticmethod
    def _require_shopping_list_owner(shopping_list: ShoppingList, owner_user_id: str) -> None:
        if shopping_list.owner_user_id != owner_user_id:
            raise ValueError("Shopping list not found")

    def _require_shopping_list_item(self, item_id: str) -> ShoppingListItem:
        item = self._session.get(ShoppingListItem, item_id)
        if item is None:
            raise ValueError("Shopping list item not found")
        return item

    def _get_or_create_meal_plan(self, owner_user_id: str, week_start: date) -> MealPlan:
        statement = select(MealPlan).where(
            MealPlan.owner_user_id == owner_user_id,
            MealPlan.week_start == week_start,
        )
        meal_plan = self._session.scalars(statement).first()
        if meal_plan is not None:
            return meal_plan
        meal_plan = MealPlan(owner_user_id=owner_user_id, week_start=week_start)
        self._session.add(meal_plan)
        self._session.flush()
        return meal_plan

    def _archive_current_lists(self, owner_user_id: str) -> None:
        for shopping_list in self._session.scalars(
            select(ShoppingList).where(
                ShoppingList.owner_user_id == owner_user_id,
                ShoppingList.status == "current",
            )
        ):
            shopping_list.status = "archived"
        self._session.flush()


def _parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def _week_start(value: date) -> date:
    return date.fromordinal(value.toordinal() - value.weekday())


def _is_oil_name(name: str) -> bool:
    return "oil" in name.strip().lower()
