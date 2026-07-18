from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.chop_it.api.schemas import (
    IngredientCategoryCreateRequest,
    IngredientCategoryResponse,
    IngredientCategoryUpdateRequest,
    IngredientCreateRequest,
    IngredientResponse,
    IngredientUpdateRequest,
    MealPlanDayResponse,
    MealPlanItemCreateRequest,
    MealPlanItemResponse,
    MealPlanTotalsResponse,
    MealPlanWeekResponse,
    RecipeCreateRequest,
    RecipeIngredientResponse,
    RecipeResponse,
    RecipeUpdateRequest,
    ShoppingListGenerateRequest,
    ShoppingListItemResponse,
    ShoppingListItemSourceDetailResponse,
    ShoppingListItemUpdateRequest,
    ShoppingListResponse,
)
from app.modules.chop_it.application.services import (
    ChopItService,
    MealPlanItemView,
    MealPlanWeekView,
    RecipeView,
    ShoppingListItemView,
    ShoppingListView,
)
from app.modules.chop_it.infrastructure.models import Ingredient, IngredientSecondaryCategory

router = APIRouter(prefix="/chop-it", tags=["chop-it"])

DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"


@dataclass(frozen=True)
class DemoUser:
    id: str = DEMO_USER_ID
    display_name: str = "Demo cook"


def get_chop_it_service() -> ChopItService:
    return ChopItService()


ChopItServiceDependency = Annotated[ChopItService, Depends(get_chop_it_service)]


def current_actor() -> DemoUser:
    return DemoUser()


ActorUser = Annotated[DemoUser, Depends(current_actor)]


@router.get("/ingredient-categories", response_model=list[IngredientCategoryResponse])
def list_ingredient_categories(
    service: ChopItServiceDependency,
) -> list[IngredientCategoryResponse]:
    return [_category_response(category) for category in service.list_categories()]


@router.post("/ingredient-categories", response_model=IngredientCategoryResponse)
def create_ingredient_category(
    request: IngredientCategoryCreateRequest,
    service: ChopItServiceDependency,
) -> IngredientCategoryResponse:
    try:
        return _category_response(service.create_category(name=request.name))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch(
    "/ingredient-categories/{category_id}",
    response_model=IngredientCategoryResponse,
)
def update_ingredient_category(
    category_id: str,
    request: IngredientCategoryUpdateRequest,
    service: ChopItServiceDependency,
) -> IngredientCategoryResponse:
    try:
        return _category_response(service.update_category(category_id, name=request.name))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/ingredient-categories/{category_id}", status_code=204)
def delete_ingredient_category(
    category_id: str,
    service: ChopItServiceDependency,
) -> None:
    try:
        service.delete_category(category_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/ingredients", response_model=list[IngredientResponse])
def list_ingredients(service: ChopItServiceDependency) -> list[IngredientResponse]:
    return [_ingredient_response(ingredient) for ingredient in service.list_ingredients()]


@router.post("/ingredients", response_model=IngredientResponse)
def create_ingredient(
    request: IngredientCreateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> IngredientResponse:
    try:
        return _ingredient_response(
            service.create_ingredient(
                name=request.name,
                primary_macro_tag=request.primary_macro_tag,
                secondary_category_id=request.secondary_category_id,
                unit=request.unit,
                kcal_per_100=request.kcal_per_100,
                protein_per_100=request.protein_per_100,
                fat_per_100=request.fat_per_100,
                carbs_per_100=request.carbs_per_100,
                grams_per_spray=request.grams_per_spray,
                actor_user_id=actor.id,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/ingredients/{ingredient_id}", response_model=IngredientResponse)
def update_ingredient(
    ingredient_id: str,
    request: IngredientUpdateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> IngredientResponse:
    try:
        return _ingredient_response(
            service.update_ingredient(
                ingredient_id,
                name=request.name,
                primary_macro_tag=request.primary_macro_tag,
                secondary_category_id=request.secondary_category_id,
                unit=request.unit,
                kcal_per_100=request.kcal_per_100,
                protein_per_100=request.protein_per_100,
                fat_per_100=request.fat_per_100,
                carbs_per_100=request.carbs_per_100,
                grams_per_spray=request.grams_per_spray,
                actor_user_id=actor.id,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/ingredients/{ingredient_id}", status_code=204)
def delete_ingredient(
    ingredient_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> None:
    try:
        service.delete_ingredient(ingredient_id, actor_user_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/recipes", response_model=list[RecipeResponse])
def list_recipes(
    service: ChopItServiceDependency,
) -> list[RecipeResponse]:
    return [_recipe_response(recipe_view) for recipe_view in service.list_recipes()]


@router.get("/recipes/archived", response_model=list[RecipeResponse])
def list_archived_recipes(
    service: ChopItServiceDependency,
) -> list[RecipeResponse]:
    return [_recipe_response(recipe_view) for recipe_view in service.list_archived_recipes()]


@router.post("/recipes", response_model=RecipeResponse)
def create_recipe(
    request: RecipeCreateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> RecipeResponse:
    try:
        return _recipe_response(
            service.create_recipe(
                title=request.title,
                description=request.description,
                image_url=request.image_url,
                prep_time_minutes=request.prep_time_minutes,
                servings=request.servings,
                oil_mode=request.oil_mode,
                oil_sprays=request.oil_sprays,
                oil_grams=request.oil_grams,
                actor_user_id=actor.id,
                ingredients=[
                    {
                        "ingredient_id": ingredient.ingredient_id,
                        "quantity": ingredient.quantity,
                    }
                    for ingredient in request.ingredients
                ],
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/recipes/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: str,
    request: RecipeUpdateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> RecipeResponse:
    try:
        return _recipe_response(
            service.update_recipe(
                recipe_id,
                title=request.title,
                description=request.description,
                image_url=request.image_url,
                prep_time_minutes=request.prep_time_minutes,
                servings=request.servings,
                oil_mode=request.oil_mode,
                oil_sprays=request.oil_sprays,
                oil_grams=request.oil_grams,
                actor_user_id=actor.id,
                ingredients=[
                    {
                        "ingredient_id": ingredient.ingredient_id,
                        "quantity": ingredient.quantity,
                    }
                    for ingredient in request.ingredients
                ],
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe(
    recipe_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> None:
    try:
        service.delete_recipe(recipe_id, actor_user_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/recipes/{recipe_id}/restore", response_model=RecipeResponse)
def restore_recipe(
    recipe_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> RecipeResponse:
    try:
        return _recipe_response(
            service.restore_recipe(recipe_id, actor_user_id=actor.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/recipes/{recipe_id}/permanent", status_code=204)
def delete_recipe_permanently(
    recipe_id: str,
    service: ChopItServiceDependency,
) -> None:
    try:
        service.delete_recipe_permanently(recipe_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/plans/week", response_model=MealPlanWeekResponse)
def get_week_plan(
    service: ChopItServiceDependency,
    actor: ActorUser,
    week_start: Annotated[date, Query(alias="weekStart")],
) -> MealPlanWeekResponse:
    try:
        return _week_plan_response(
            service.list_week_plan(owner_user_id=actor.id, week_start=week_start)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/plans/items", response_model=MealPlanItemResponse)
def create_meal_plan_item(
    request: MealPlanItemCreateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> MealPlanItemResponse:
    try:
        return _meal_plan_item_response(
            service.create_meal_plan_item(
                owner_user_id=actor.id,
                meal_date=request.meal_date,
                meal_slot=request.meal_slot,
                recipe_id=request.recipe_id,
                servings=request.servings,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/plans/items/{item_id}", status_code=204)
def delete_meal_plan_item(
    item_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> None:
    try:
        service.delete_meal_plan_item(item_id, owner_user_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/shopping-lists/generate", response_model=ShoppingListResponse)
def generate_shopping_list(
    request: ShoppingListGenerateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> ShoppingListResponse:
    try:
        return _shopping_list_response(
            service.generate_shopping_list(
                owner_user_id=actor.id,
                title=request.title,
                start_date=request.start_date,
                end_date=request.end_date,
                excluded_recipe_ids=request.excluded_recipe_ids,
                excluded_plan_items=[
                    {
                        "plan_item_id": item.plan_item_id,
                        "servings": item.servings,
                    }
                    for item in request.excluded_plan_items
                ],
                excluded_plan_item_ids=request.excluded_plan_item_ids,
                pantry_items=[
                    {
                        "ingredient_id": item.ingredient_id,
                        "quantity": item.quantity,
                    }
                    for item in request.pantry_items
                ],
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/shopping-lists/current", response_model=ShoppingListResponse | None)
def get_current_shopping_list(
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> ShoppingListResponse | None:
    shopping_list = service.get_current_shopping_list(owner_user_id=actor.id)
    return _shopping_list_response(shopping_list) if shopping_list is not None else None


@router.get("/shopping-lists/archived", response_model=list[ShoppingListResponse])
def list_archived_shopping_lists(
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> list[ShoppingListResponse]:
    return [
        _shopping_list_response(shopping_list)
        for shopping_list in service.list_archived_shopping_lists(owner_user_id=actor.id)
    ]


@router.post("/shopping-lists/{shopping_list_id}/complete", response_model=ShoppingListResponse)
def complete_shopping_list(
    shopping_list_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> ShoppingListResponse:
    try:
        return _shopping_list_response(
            service.complete_shopping_list(shopping_list_id, owner_user_id=actor.id)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/shopping-lists/{shopping_list_id}/recover", response_model=ShoppingListResponse)
def recover_shopping_list(
    shopping_list_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> ShoppingListResponse:
    try:
        return _shopping_list_response(
            service.recover_shopping_list(shopping_list_id, owner_user_id=actor.id)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/shopping-lists/{shopping_list_id}", status_code=204)
def delete_shopping_list(
    shopping_list_id: str,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> None:
    try:
        service.delete_shopping_list(shopping_list_id, owner_user_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/shopping-lists/items/{item_id}", response_model=ShoppingListItemResponse)
def update_shopping_list_item(
    item_id: str,
    request: ShoppingListItemUpdateRequest,
    service: ChopItServiceDependency,
    actor: ActorUser,
) -> ShoppingListItemResponse:
    try:
        return _shopping_list_item_response(
            service.update_shopping_list_item_checked(
                item_id,
                owner_user_id=actor.id,
                is_checked=request.is_checked,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _category_response(category: IngredientSecondaryCategory) -> IngredientCategoryResponse:
    return IngredientCategoryResponse(
        id=category.id,
        name=category.name,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


def _ingredient_response(ingredient: Ingredient) -> IngredientResponse:
    return IngredientResponse(
        id=ingredient.id,
        name=ingredient.name,
        primary_macro_tag=ingredient.primary_macro_tag,
        secondary_category_id=ingredient.secondary_category_id,
        unit=ingredient.unit,
        kcal_per_100=ingredient.kcal_per_100,
        protein_per_100=ingredient.protein_per_100,
        fat_per_100=ingredient.fat_per_100,
        carbs_per_100=ingredient.carbs_per_100,
        is_oil=ingredient.is_oil,
        grams_per_spray=ingredient.grams_per_spray,
        created_at=ingredient.created_at,
        updated_at=ingredient.updated_at,
    )


def _recipe_response(recipe_view: RecipeView) -> RecipeResponse:
    recipe = recipe_view.recipe
    return RecipeResponse(
        id=recipe.id,
        title=recipe.title,
        description=recipe.description,
        image_url=recipe.image_url,
        prep_time_minutes=recipe.prep_time_minutes,
        servings=recipe.servings,
        oil_mode=recipe.oil_mode,
        oil_sprays=recipe.oil_sprays,
        oil_grams=recipe.oil_grams,
        total_kcal=recipe.total_kcal,
        total_protein=recipe.total_protein,
        total_fat=recipe.total_fat,
        total_carbs=recipe.total_carbs,
        per_serving_kcal=recipe.per_serving_kcal,
        per_serving_protein=recipe.per_serving_protein,
        per_serving_fat=recipe.per_serving_fat,
        per_serving_carbs=recipe.per_serving_carbs,
        ingredients=[
            RecipeIngredientResponse(
                ingredient_id=ingredient.ingredient_id,
                quantity=ingredient.quantity,
            )
            for ingredient in recipe_view.ingredients
        ],
        created_by_user_id=recipe.created_by_user_id,
        created_by_display_name="Demo cook",
        created_by_email="",
        updated_by_user_id=recipe.updated_by_user_id,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
        archived_at=recipe.archived_at,
    )


def _meal_plan_item_response(item_view: MealPlanItemView) -> MealPlanItemResponse:
    item = item_view.item
    return MealPlanItemResponse(
        id=item.id,
        owner_user_id=item.owner_user_id,
        meal_date=item.meal_date,
        meal_slot=item.meal_slot,
        recipe_id=item.recipe_id,
        recipe_title=item_view.recipe.title,
        servings=item.servings,
        kcal=item_view.totals.kcal,
        protein=item_view.totals.protein,
        fat=item_view.totals.fat,
        carbs=item_view.totals.carbs,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _week_plan_response(week_view: MealPlanWeekView) -> MealPlanWeekResponse:
    return MealPlanWeekResponse(
        owner_user_id=week_view.owner_user_id,
        week_start=week_view.week_start,
        items=[_meal_plan_item_response(item) for item in week_view.items],
        days=[
            MealPlanDayResponse(
                date=day.date,
                total_kcal=day.totals.kcal,
                total_protein=day.totals.protein,
                total_fat=day.totals.fat,
                total_carbs=day.totals.carbs,
            )
            for day in week_view.days
        ],
        week_totals=MealPlanTotalsResponse(
            kcal=week_view.week_totals.kcal,
            protein=week_view.week_totals.protein,
            fat=week_view.week_totals.fat,
            carbs=week_view.week_totals.carbs,
        ),
    )


def _shopping_list_response(shopping_list_view: ShoppingListView) -> ShoppingListResponse:
    shopping_list = shopping_list_view.shopping_list
    return ShoppingListResponse(
        id=shopping_list.id,
        owner_user_id=shopping_list.owner_user_id,
        title=shopping_list.title,
        start_date=shopping_list.start_date,
        end_date=shopping_list.end_date,
        status=shopping_list.status,
        completed_at=shopping_list.completed_at,
        items=[_shopping_list_item_response(item_view) for item_view in shopping_list_view.items],
        created_at=shopping_list.created_at,
        updated_at=shopping_list.updated_at,
    )


def _shopping_list_item_response(
    item_view: ShoppingListItemView,
) -> ShoppingListItemResponse:
    return ShoppingListItemResponse(
        id=item_view.item.id,
        ingredient_id=item_view.item.ingredient_id,
        ingredient_name=item_view.ingredient.name,
        unit=item_view.ingredient.unit,
        section=item_view.item.section,
        required_quantity=item_view.item.required_quantity,
        pantry_quantity=item_view.item.pantry_quantity,
        final_quantity=item_view.item.final_quantity,
        is_checked=item_view.item.is_checked,
        source_recipes=item_view.source_recipes,
        source_details=[
            ShoppingListItemSourceDetailResponse(
                recipe_title=detail.recipe_title,
                meal_date=detail.meal_date,
                meal_slot=detail.meal_slot,
                servings=detail.servings,
                quantity=detail.quantity,
            )
            for detail in item_view.source_details
        ],
    )
