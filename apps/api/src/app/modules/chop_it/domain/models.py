from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class OilMode(StrEnum):
    NONE = "none"
    SPRAY = "spray"
    GRAMS = "grams"


@dataclass(frozen=True)
class MacroTotals:
    kcal: float
    protein: float
    fat: float
    carbs: float

    def __add__(self, other: MacroTotals) -> MacroTotals:
        return MacroTotals(
            kcal=self.kcal + other.kcal,
            protein=self.protein + other.protein,
            fat=self.fat + other.fat,
            carbs=self.carbs + other.carbs,
        )

    def divided_by(self, divisor: float) -> MacroTotals:
        if divisor <= 0:
            raise ValueError("Divisor must be greater than zero")
        return MacroTotals(
            kcal=self.kcal / divisor,
            protein=self.protein / divisor,
            fat=self.fat / divisor,
            carbs=self.carbs / divisor,
        )


ZERO_MACROS = MacroTotals(kcal=0, protein=0, fat=0, carbs=0)


@dataclass(frozen=True)
class IngredientNutrition:
    kcal_per_100: float
    protein_per_100: float
    fat_per_100: float
    carbs_per_100: float


@dataclass(frozen=True)
class RecipeIngredient:
    nutrition: IngredientNutrition
    quantity: float


@dataclass(frozen=True)
class RecipeNutritionInput:
    ingredients: list[RecipeIngredient]
    servings: int
    oil_mode: OilMode
    oil_sprays: int | None
    oil_grams: float | None
    oil_nutrition: IngredientNutrition = IngredientNutrition(
        kcal_per_100=900,
        protein_per_100=0,
        fat_per_100=100,
        carbs_per_100=0,
    )
    oil_grams_per_spray: float = 1


@dataclass(frozen=True)
class RecipeNutrition:
    total: MacroTotals
    per_serving: MacroTotals


def calculate_ingredient_nutrition(
    nutrition: IngredientNutrition,
    *,
    quantity: float,
) -> MacroTotals:
    if quantity < 0:
        raise ValueError("Ingredient quantity cannot be negative")
    factor = quantity / 100
    return MacroTotals(
        kcal=nutrition.kcal_per_100 * factor,
        protein=nutrition.protein_per_100 * factor,
        fat=nutrition.fat_per_100 * factor,
        carbs=nutrition.carbs_per_100 * factor,
    )


def calculate_recipe_nutrition(recipe: RecipeNutritionInput) -> RecipeNutrition:
    if recipe.servings <= 0:
        raise ValueError("Recipe servings must be greater than zero")

    total = ZERO_MACROS
    for ingredient in recipe.ingredients:
        total += calculate_ingredient_nutrition(
            ingredient.nutrition,
            quantity=ingredient.quantity,
        )

    total += _oil_nutrition(recipe)
    return RecipeNutrition(total=total, per_serving=total.divided_by(recipe.servings))


def _oil_nutrition(recipe: RecipeNutritionInput) -> MacroTotals:
    oil_grams = _oil_grams(recipe)
    return calculate_ingredient_nutrition(recipe.oil_nutrition, quantity=oil_grams)


def _oil_grams(recipe: RecipeNutritionInput) -> float:
    if recipe.oil_mode == OilMode.NONE:
        return 0
    if recipe.oil_mode == OilMode.SPRAY:
        if recipe.oil_sprays is None or not 1 <= recipe.oil_sprays <= 5:
            raise ValueError("Oil sprays must be between 1 and 5")
        if recipe.oil_grams_per_spray <= 0:
            raise ValueError("Oil grams per spray must be greater than zero")
        return float(recipe.oil_sprays) * recipe.oil_grams_per_spray
    if recipe.oil_mode == OilMode.GRAMS:
        if recipe.oil_grams is None or recipe.oil_grams < 0:
            raise ValueError("Oil grams cannot be negative")
        return recipe.oil_grams
    raise ValueError("Unsupported oil mode")
