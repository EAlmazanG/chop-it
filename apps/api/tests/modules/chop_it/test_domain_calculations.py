import pytest

from app.modules.chop_it.domain.models import (
    IngredientNutrition,
    OilMode,
    RecipeIngredient,
    RecipeNutritionInput,
    calculate_ingredient_nutrition,
    calculate_recipe_nutrition,
)


def test_calculates_ingredient_nutrition_from_quantity_per_100_units() -> None:
    nutrition = calculate_ingredient_nutrition(
        IngredientNutrition(kcal_per_100=120, protein_per_100=20, fat_per_100=4, carbs_per_100=2),
        quantity=150,
    )

    assert nutrition.kcal == pytest.approx(180)
    assert nutrition.protein == pytest.approx(30)
    assert nutrition.fat == pytest.approx(6)
    assert nutrition.carbs == pytest.approx(3)


def test_calculates_recipe_nutrition_with_oil_sprays_and_servings() -> None:
    nutrition = calculate_recipe_nutrition(
        RecipeNutritionInput(
            ingredients=[
                RecipeIngredient(
                    nutrition=IngredientNutrition(
                        kcal_per_100=120,
                        protein_per_100=20,
                        fat_per_100=4,
                        carbs_per_100=2,
                    ),
                    quantity=200,
                )
            ],
            servings=2,
            oil_mode=OilMode.SPRAY,
            oil_sprays=3,
            oil_grams=None,
        )
    )

    assert nutrition.total.kcal == pytest.approx(267)
    assert nutrition.total.protein == pytest.approx(40)
    assert nutrition.total.fat == pytest.approx(11)
    assert nutrition.total.carbs == pytest.approx(4)
    assert nutrition.per_serving.kcal == pytest.approx(133.5)
    assert nutrition.per_serving.protein == pytest.approx(20)
    assert nutrition.per_serving.fat == pytest.approx(5.5)
    assert nutrition.per_serving.carbs == pytest.approx(2)


def test_calculates_recipe_nutrition_with_direct_oil_grams() -> None:
    nutrition = calculate_recipe_nutrition(
        RecipeNutritionInput(
            ingredients=[],
            servings=4,
            oil_mode=OilMode.GRAMS,
            oil_sprays=None,
            oil_grams=12,
        )
    )

    assert nutrition.total.kcal == pytest.approx(108)
    assert nutrition.total.fat == pytest.approx(12)
    assert nutrition.per_serving.kcal == pytest.approx(27)
    assert nutrition.per_serving.fat == pytest.approx(3)


def test_calculates_recipe_nutrition_with_configured_oil_spray_reference() -> None:
    nutrition = calculate_recipe_nutrition(
        RecipeNutritionInput(
            ingredients=[],
            servings=1,
            oil_mode=OilMode.SPRAY,
            oil_sprays=2,
            oil_grams=None,
            oil_nutrition=IngredientNutrition(
                kcal_per_100=884,
                protein_per_100=0,
                fat_per_100=100,
                carbs_per_100=0,
            ),
            oil_grams_per_spray=0.25,
        )
    )

    assert nutrition.total.kcal == pytest.approx(4.42)
    assert nutrition.total.fat == pytest.approx(0.5)


def test_recipe_servings_must_be_positive() -> None:
    with pytest.raises(ValueError, match="Recipe servings must be greater than zero"):
        calculate_recipe_nutrition(
            RecipeNutritionInput(
                ingredients=[],
                servings=0,
                oil_mode=OilMode.NONE,
                oil_sprays=None,
                oil_grams=None,
            )
        )


def test_spray_count_must_be_between_one_and_five() -> None:
    with pytest.raises(ValueError, match="Oil sprays must be between 1 and 5"):
        calculate_recipe_nutrition(
            RecipeNutritionInput(
                ingredients=[],
                servings=1,
                oil_mode=OilMode.SPRAY,
                oil_sprays=6,
                oil_grams=None,
            )
        )
