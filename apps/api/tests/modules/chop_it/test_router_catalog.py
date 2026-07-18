from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.settings import get_settings
from app.db.base import Base
from app.main import create_app
from app.modules.chop_it.api.router import DEMO_USER_ID, get_chop_it_service
from app.modules.chop_it.application.services import ChopItService
from app.modules.chop_it.infrastructure.models import User


def _client() -> TestClient:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    translated_engine = engine.execution_options(schema_translate_map={"chop_it": None})
    Base.metadata.create_all(translated_engine)

    with Session(translated_engine) as session:
        session.add(User(id=DEMO_USER_ID, display_name="Demo cook"))
        session.commit()

    def session_factory() -> Iterator[Session]:
        with Session(translated_engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_chop_it_service] = lambda: ChopItService(session_factory)
    return TestClient(app)


def test_single_user_can_create_and_list_categories_and_ingredients(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}

        category_response = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        )
        ingredient_response = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category_response.json()["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        )
        ingredients_response = client.get("/api/v1/chop-it/ingredients", headers=headers)
    finally:
        get_settings.cache_clear()

    assert category_response.status_code == 200
    assert category_response.json()["name"] == "Carne"
    assert ingredient_response.status_code == 200
    assert ingredient_response.json()["name"] == "Pollo"
    assert ingredient_response.json()["primaryMacroTag"] == "protein"
    assert ingredient_response.json()["isOil"] is False
    assert ingredient_response.json()["gramsPerSpray"] is None
    assert ingredients_response.status_code == 200
    assert [ingredient["name"] for ingredient in ingredients_response.json()] == ["Pollo"]


def test_create_ingredient_rejects_missing_category(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}

        response = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": "missing-category",
                "unit": "g",
                "kcalPer100": 120.5,
                "proteinPer100": 22.2,
                "fatPer100": 3.1,
                "carbsPer100": 0,
            },
        )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 400
    assert response.json()["detail"] == "Ingredient category not found"


def test_single_user_can_update_and_delete_categories_and_ingredients(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        ingredient = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()

        updated_category_response = client.patch(
            f"/api/v1/chop-it/ingredient-categories/{category['id']}",
            headers=headers,
            json={"name": "Carnes"},
        )
        updated_ingredient_response = client.patch(
            f"/api/v1/chop-it/ingredients/{ingredient['id']}",
            headers=headers,
            json={
                "name": "Pechuga de pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 110,
                "proteinPer100": 24,
                "fatPer100": 2,
                "carbsPer100": 0,
            },
        )
        delete_ingredient_response = client.delete(
            f"/api/v1/chop-it/ingredients/{ingredient['id']}",
            headers=headers,
        )
        ingredients_response = client.get("/api/v1/chop-it/ingredients", headers=headers)
    finally:
        get_settings.cache_clear()

    assert updated_category_response.status_code == 200
    assert updated_category_response.json()["name"] == "Carnes"
    assert updated_ingredient_response.status_code == 200
    assert updated_ingredient_response.json()["name"] == "Pechuga de pollo"
    assert updated_ingredient_response.json()["kcalPer100"] == 110
    assert delete_ingredient_response.status_code == 204
    assert ingredients_response.json() == []


def test_oil_ingredient_can_be_updated_but_not_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Grasa"},
        ).json()
        ingredient = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Aceite de oliva",
                "primaryMacroTag": "fat",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 884,
                "proteinPer100": 0,
                "fatPer100": 100,
                "carbsPer100": 0,
                "gramsPerSpray": 0.25,
            },
        ).json()

        update_response = client.patch(
            f"/api/v1/chop-it/ingredients/{ingredient['id']}",
            headers=headers,
            json={
                "name": "Aceite de oliva",
                "primaryMacroTag": "fat",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 884,
                "proteinPer100": 0,
                "fatPer100": 100,
                "carbsPer100": 0,
                "gramsPerSpray": 0.5,
            },
        )
        delete_response = client.delete(
            f"/api/v1/chop-it/ingredients/{ingredient['id']}",
            headers=headers,
        )
    finally:
        get_settings.cache_clear()

    assert ingredient["isOil"] is True
    assert ingredient["gramsPerSpray"] == 0.25
    assert update_response.status_code == 200
    assert update_response.json()["gramsPerSpray"] == 0.5
    assert delete_response.status_code == 400
    assert delete_response.json()["detail"] == "Oil ingredient cannot be archived"


def test_single_user_can_create_and_list_recipes_with_calculated_macros(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()

        create_response = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo plancha",
                "description": "Cena sencilla",
                "imageUrl": "https://example.com/pollo.jpg",
                "prepTimeMinutes": 15,
                "servings": 2,
                "oilMode": "spray",
                "oilSprays": 2,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        )
        list_response = client.get("/api/v1/chop-it/recipes", headers=headers)
    finally:
        get_settings.cache_clear()

    assert create_response.status_code == 200
    created = create_response.json()
    assert created["title"] == "Pollo plancha"
    assert created["ingredients"] == [{"ingredientId": chicken["id"], "quantity": 200}]
    assert created["totalKcal"] == 258
    assert created["totalProtein"] == 44
    assert created["totalFat"] == 8
    assert created["perServingKcal"] == 129
    assert created["createdByUserId"] == created["updatedByUserId"]
    assert created["createdByDisplayName"] == "Demo cook"
    assert created["createdByEmail"] == ""
    assert list_response.status_code == 200
    assert [recipe["title"] for recipe in list_response.json()] == ["Pollo plancha"]
    assert list_response.json()[0]["createdByDisplayName"] == "Demo cook"
    assert list_response.json()[0]["createdByEmail"] == ""


def test_single_user_can_update_archive_restore_and_delete_recipes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()
        recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 10,
                "servings": 1,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 100}],
            },
        ).json()

        update_response = client.patch(
            f"/api/v1/chop-it/recipes/{recipe['id']}",
            headers=headers,
            json={
                "title": "Pollo doble",
                "description": "Mas cantidad",
                "imageUrl": None,
                "prepTimeMinutes": 20,
                "servings": 2,
                "oilMode": "grams",
                "oilSprays": None,
                "oilGrams": 5,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        )
        archive_response = client.delete(f"/api/v1/chop-it/recipes/{recipe['id']}", headers=headers)
        list_response = client.get("/api/v1/chop-it/recipes", headers=headers)
        archived_response = client.get("/api/v1/chop-it/recipes/archived", headers=headers)
        restore_response = client.post(
            f"/api/v1/chop-it/recipes/{recipe['id']}/restore",
            headers=headers,
        )
        force_delete_response = client.delete(
            f"/api/v1/chop-it/recipes/{recipe['id']}/permanent",
            headers=headers,
        )
        archived_after_delete_response = client.get(
            "/api/v1/chop-it/recipes/archived",
            headers=headers,
        )
    finally:
        get_settings.cache_clear()

    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Pollo doble"
    assert update_response.json()["totalKcal"] == 285
    assert update_response.json()["totalFat"] == 11
    assert archive_response.status_code == 204
    assert list_response.json() == []
    assert [recipe["title"] for recipe in archived_response.json()] == ["Pollo doble"]
    assert restore_response.status_code == 200
    assert restore_response.json()["archivedAt"] is None
    assert force_delete_response.status_code == 204
    assert archived_after_delete_response.json() == []


def test_single_user_can_manage_week_plan(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()
        recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo plancha",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 15,
                "servings": 2,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        ).json()

        create_response = client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-08",
                "mealSlot": "dinner",
                "recipeId": recipe["id"],
                "servings": 1,
            },
        )
        list_response = client.get(
            "/api/v1/chop-it/plans/week?weekStart=2026-06-08",
            headers=headers,
        )
        delete_response = client.delete(
            f"/api/v1/chop-it/plans/items/{create_response.json()['id']}",
            headers=headers,
        )
        after_delete_response = client.get(
            "/api/v1/chop-it/plans/week?weekStart=2026-06-08",
            headers=headers,
        )
    finally:
        get_settings.cache_clear()

    assert create_response.status_code == 200
    assert create_response.json()["ownerUserId"] == DEMO_USER_ID
    assert create_response.json()["recipeTitle"] == "Pollo plancha"
    assert list_response.status_code == 200
    week = list_response.json()
    assert week["ownerUserId"] == DEMO_USER_ID
    assert week["weekStart"] == "2026-06-08"
    assert len(week["items"]) == 1
    assert week["items"][0]["mealSlot"] == "dinner"
    assert week["days"][0]["date"] == "2026-06-08"
    assert week["days"][0]["totalKcal"] == 120
    assert week["weekTotals"]["protein"] == 22
    assert delete_response.status_code == 204
    assert after_delete_response.json()["items"] == []


def test_plan_requests_reject_unknown_profile_selection_fields() -> None:
    client = _client()

    response = client.post(
        "/api/v1/chop-it/plans/items",
        json={
            "actingUserId": "another-profile",
            "mealDate": "2026-06-08",
            "mealSlot": "dinner",
            "recipeId": "recipe-id",
            "servings": 1,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "extra_forbidden"


def test_single_user_can_generate_current_shopping_list_from_plan(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()
        recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo plancha",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 15,
                "servings": 2,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        ).json()
        rice = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Arroz",
                "primaryMacroTag": "carb",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 360,
                "proteinPer100": 7,
                "fatPer100": 1,
                "carbsPer100": 79,
            },
        ).json()
        rice_recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Arroz blanco",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 20,
                "servings": 2,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": rice["id"], "quantity": 160}],
            },
        ).json()
        dinner_plan_item = client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-08",
                "mealSlot": "dinner",
                "recipeId": recipe["id"],
                "servings": 1,
            },
        ).json()
        client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-08",
                "mealSlot": "lunch",
                "recipeId": rice_recipe["id"],
                "servings": 1,
            },
        )

        generate_response = client.post(
            "/api/v1/chop-it/shopping-lists/generate",
            headers=headers,
            json={
                "title": "Compra semanal",
                "startDate": "2026-06-08",
                "endDate": "2026-06-08",
                "excludedRecipeIds": [rice_recipe["id"]],
                "pantryItems": [{"ingredientId": chicken["id"], "quantity": 100}],
            },
        )
        generated_payload = generate_response.json()
        generated_items_by_name = {
            item["ingredientName"]: item for item in generated_payload["items"]
        }
        unchecked_pantry_response = client.patch(
            f"/api/v1/chop-it/shopping-lists/items/{generated_items_by_name['Pollo']['id']}",
            headers=headers,
            json={"isChecked": False},
        )
        unchecked_excluded_response = client.patch(
            f"/api/v1/chop-it/shopping-lists/items/{generated_items_by_name['Arroz']['id']}",
            headers=headers,
            json={"isChecked": False},
        )
        current_response = client.get("/api/v1/chop-it/shopping-lists/current", headers=headers)
        complete_response = client.post(
            f"/api/v1/chop-it/shopping-lists/{generate_response.json()['id']}/complete",
            headers=headers,
        )
        completed_items_by_name = {
            item["ingredientName"]: item for item in complete_response.json()["items"]
        }
        archived_response = client.get("/api/v1/chop-it/shopping-lists/archived", headers=headers)
    finally:
        get_settings.cache_clear()

    assert generate_response.status_code == 200
    generated = generate_response.json()
    assert generated["title"] == "Compra semanal"
    assert generated["status"] == "current"
    items_by_name = {item["ingredientName"]: item for item in generated["items"]}
    assert items_by_name["Pollo"]["section"] == "pantry"
    assert items_by_name["Pollo"]["requiredQuantity"] == 100
    assert items_by_name["Pollo"]["pantryQuantity"] == 100
    assert items_by_name["Pollo"]["finalQuantity"] == 0
    assert items_by_name["Pollo"]["isChecked"] is True
    assert items_by_name["Pollo"]["sourceRecipes"] == ["Pollo plancha"]
    assert items_by_name["Pollo"]["sourceDetails"] == [
        {
            "recipeTitle": "Pollo plancha",
            "mealDate": "2026-06-08",
            "mealSlot": "dinner",
            "servings": 1.0,
            "quantity": 100.0,
        }
    ]
    assert items_by_name["Arroz"]["section"] == "recipe_excluded"
    assert items_by_name["Arroz"]["requiredQuantity"] == 80
    assert items_by_name["Arroz"]["finalQuantity"] == 80
    assert items_by_name["Arroz"]["isChecked"] is True
    assert items_by_name["Arroz"]["sourceRecipes"] == ["Arroz blanco"]
    assert dinner_plan_item["id"]
    assert unchecked_pantry_response.status_code == 400
    assert (
        unchecked_pantry_response.json()["detail"]
        == "Pantry and excluded recipe items cannot be unchecked"
    )
    assert unchecked_excluded_response.status_code == 400
    assert (
        unchecked_excluded_response.json()["detail"]
        == "Pantry and excluded recipe items cannot be unchecked"
    )
    assert current_response.json()["id"] == generated["id"]
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "archived"
    assert completed_items_by_name["Pollo"]["section"] == "pantry"
    assert completed_items_by_name["Pollo"]["isChecked"] is True
    assert completed_items_by_name["Arroz"]["section"] == "recipe_excluded"
    assert completed_items_by_name["Arroz"]["isChecked"] is True
    assert [shopping_list["id"] for shopping_list in archived_response.json()] == [generated["id"]]


def test_shopping_list_excludes_only_selected_plan_assignment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()
        recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo plancha",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 15,
                "servings": 2,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        ).json()
        first_plan_item = client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-08",
                "mealSlot": "lunch",
                "recipeId": recipe["id"],
                "servings": 1,
            },
        ).json()
        client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-09",
                "mealSlot": "dinner",
                "recipeId": recipe["id"],
                "servings": 2,
            },
        )

        generate_response = client.post(
            "/api/v1/chop-it/shopping-lists/generate",
            headers=headers,
            json={
                "title": "Compra parcial",
                "startDate": "2026-06-08",
                "endDate": "2026-06-09",
                "excludedPlanItemIds": [first_plan_item["id"]],
                "pantryItems": [],
            },
        )
    finally:
        get_settings.cache_clear()

    assert generate_response.status_code == 200
    items = generate_response.json()["items"]
    missing_chicken = next(item for item in items if item["section"] == "missing")
    excluded_chicken = next(item for item in items if item["section"] == "recipe_excluded")
    assert missing_chicken["ingredientName"] == "Pollo"
    assert missing_chicken["requiredQuantity"] == 200
    assert missing_chicken["sourceDetails"] == [
        {
            "recipeTitle": "Pollo plancha",
            "mealDate": "2026-06-09",
            "mealSlot": "dinner",
            "servings": 2.0,
            "quantity": 200.0,
        }
    ]
    assert excluded_chicken["ingredientName"] == "Pollo"
    assert excluded_chicken["requiredQuantity"] == 100
    assert excluded_chicken["sourceDetails"] == [
        {
            "recipeTitle": "Pollo plancha",
            "mealDate": "2026-06-08",
            "mealSlot": "lunch",
            "servings": 1.0,
            "quantity": 100.0,
        }
    ]


def test_shopping_list_excludes_partial_servings_from_plan_assignment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()
        recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo plancha",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 15,
                "servings": 2,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        ).json()
        plan_item = client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-08",
                "mealSlot": "lunch",
                "recipeId": recipe["id"],
                "servings": 3,
            },
        ).json()

        generate_response = client.post(
            "/api/v1/chop-it/shopping-lists/generate",
            headers=headers,
            json={
                "title": "Compra parcial",
                "startDate": "2026-06-08",
                "endDate": "2026-06-08",
                "excludedPlanItems": [{"planItemId": plan_item["id"], "servings": 1}],
                "pantryItems": [],
            },
        )
    finally:
        get_settings.cache_clear()

    assert generate_response.status_code == 200
    items = generate_response.json()["items"]
    missing_chicken = next(item for item in items if item["section"] == "missing")
    excluded_chicken = next(item for item in items if item["section"] == "recipe_excluded")
    assert missing_chicken["requiredQuantity"] == 200
    assert missing_chicken["sourceDetails"] == [
        {
            "recipeTitle": "Pollo plancha",
            "mealDate": "2026-06-08",
            "mealSlot": "lunch",
            "servings": 2.0,
            "quantity": 200.0,
        }
    ]
    assert excluded_chicken["requiredQuantity"] == 100
    assert excluded_chicken["sourceDetails"] == [
        {
            "recipeTitle": "Pollo plancha",
            "mealDate": "2026-06-08",
            "mealSlot": "lunch",
            "servings": 1.0,
            "quantity": 100.0,
        }
    ]


def test_single_user_can_toggle_and_recover_shopping_lists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        client = _client()
        headers = {}
        category = client.post(
            "/api/v1/chop-it/ingredient-categories",
            headers=headers,
            json={"name": "Carne"},
        ).json()
        chicken = client.post(
            "/api/v1/chop-it/ingredients",
            headers=headers,
            json={
                "name": "Pollo",
                "primaryMacroTag": "protein",
                "secondaryCategoryId": category["id"],
                "unit": "g",
                "kcalPer100": 120,
                "proteinPer100": 22,
                "fatPer100": 3,
                "carbsPer100": 0,
            },
        ).json()
        recipe = client.post(
            "/api/v1/chop-it/recipes",
            headers=headers,
            json={
                "title": "Pollo plancha",
                "description": "",
                "imageUrl": None,
                "prepTimeMinutes": 15,
                "servings": 2,
                "oilMode": "none",
                "oilSprays": None,
                "oilGrams": None,
                "ingredients": [{"ingredientId": chicken["id"], "quantity": 200}],
            },
        ).json()
        client.post(
            "/api/v1/chop-it/plans/items",
            headers=headers,
            json={
                "mealDate": "2026-06-08",
                "mealSlot": "dinner",
                "recipeId": recipe["id"],
                "servings": 1,
            },
        )
        shopping_list = client.post(
            "/api/v1/chop-it/shopping-lists/generate",
            headers=headers,
            json={
                "title": "Compra semanal",
                "startDate": "2026-06-08",
                "endDate": "2026-06-08",
                "excludedRecipeIds": [],
                "pantryItems": [],
            },
        ).json()
        item_id = shopping_list["items"][0]["id"]

        checked_response = client.patch(
            f"/api/v1/chop-it/shopping-lists/items/{item_id}",
            headers=headers,
            json={"isChecked": True},
        )
        unchecked_response = client.patch(
            f"/api/v1/chop-it/shopping-lists/items/{item_id}",
            headers=headers,
            json={"isChecked": False},
        )
        client.post(
            "/api/v1/chop-it/shopping-lists/generate",
            headers=headers,
            json={
                "title": "Compra siguiente",
                "startDate": "2026-06-08",
                "endDate": "2026-06-08",
                "excludedRecipeIds": [],
                "pantryItems": [],
            },
        )
        recovered_response = client.post(
            f"/api/v1/chop-it/shopping-lists/{shopping_list['id']}/recover",
            headers=headers,
        )
        current_response = client.get("/api/v1/chop-it/shopping-lists/current", headers=headers)
        complete_response = client.post(
            f"/api/v1/chop-it/shopping-lists/{shopping_list['id']}/complete",
            headers=headers,
        )
        locked_response = client.patch(
            f"/api/v1/chop-it/shopping-lists/items/{item_id}",
            headers=headers,
            json={"isChecked": False},
        )
        recover_completed_response = client.post(
            f"/api/v1/chop-it/shopping-lists/{shopping_list['id']}/recover",
            headers=headers,
        )
        delete_response = client.delete(
            f"/api/v1/chop-it/shopping-lists/{shopping_list['id']}",
            headers=headers,
        )
        current_after_delete_response = client.get(
            "/api/v1/chop-it/shopping-lists/current",
            headers=headers,
        )
    finally:
        get_settings.cache_clear()

    assert checked_response.status_code == 200
    assert checked_response.json()["isChecked"] is True
    assert checked_response.json()["section"] == "bought"
    assert unchecked_response.status_code == 200
    assert unchecked_response.json()["isChecked"] is False
    assert unchecked_response.json()["section"] == "missing"
    assert recovered_response.status_code == 200
    assert recovered_response.json()["status"] == "current"
    assert current_response.json()["id"] == shopping_list["id"]
    assert complete_response.status_code == 200
    assert complete_response.json()["completedAt"] is not None
    assert locked_response.status_code == 400
    assert locked_response.json()["detail"] == "Completed shopping lists cannot be modified"
    assert recover_completed_response.status_code == 400
    assert (
        recover_completed_response.json()["detail"]
        == "Completed shopping lists cannot be recovered"
    )
    assert delete_response.status_code == 204
    assert current_after_delete_response.json() is None
