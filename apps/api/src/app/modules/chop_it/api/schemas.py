from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IngredientCategoryCreateRequest(StrictRequest):
    name: str


class IngredientCategoryUpdateRequest(StrictRequest):
    name: str


class IngredientCategoryResponse(BaseModel):
    id: str
    name: str
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class IngredientCreateRequest(StrictRequest):
    name: str
    primary_macro_tag: str = Field(validation_alias="primaryMacroTag")
    secondary_category_id: str = Field(validation_alias="secondaryCategoryId")
    unit: str
    kcal_per_100: float = Field(validation_alias="kcalPer100")
    protein_per_100: float = Field(validation_alias="proteinPer100")
    fat_per_100: float = Field(validation_alias="fatPer100")
    carbs_per_100: float = Field(validation_alias="carbsPer100")
    grams_per_spray: float | None = Field(default=None, gt=0, validation_alias="gramsPerSpray")


class IngredientUpdateRequest(StrictRequest):
    name: str
    primary_macro_tag: str = Field(validation_alias="primaryMacroTag")
    secondary_category_id: str = Field(validation_alias="secondaryCategoryId")
    unit: str
    kcal_per_100: float = Field(validation_alias="kcalPer100")
    protein_per_100: float = Field(validation_alias="proteinPer100")
    fat_per_100: float = Field(validation_alias="fatPer100")
    carbs_per_100: float = Field(validation_alias="carbsPer100")
    grams_per_spray: float | None = Field(default=None, gt=0, validation_alias="gramsPerSpray")


class IngredientResponse(BaseModel):
    id: str
    name: str
    primary_macro_tag: str = Field(serialization_alias="primaryMacroTag")
    secondary_category_id: str = Field(serialization_alias="secondaryCategoryId")
    unit: str
    kcal_per_100: float = Field(serialization_alias="kcalPer100")
    protein_per_100: float = Field(serialization_alias="proteinPer100")
    fat_per_100: float = Field(serialization_alias="fatPer100")
    carbs_per_100: float = Field(serialization_alias="carbsPer100")
    is_oil: bool = Field(serialization_alias="isOil")
    grams_per_spray: float | None = Field(serialization_alias="gramsPerSpray")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class RecipeIngredientRequest(StrictRequest):
    ingredient_id: str = Field(validation_alias="ingredientId")
    quantity: float


class RecipeIngredientResponse(BaseModel):
    ingredient_id: str = Field(serialization_alias="ingredientId")
    quantity: float


class RecipeCreateRequest(StrictRequest):
    title: str
    description: str
    image_url: str | None = Field(validation_alias="imageUrl")
    prep_time_minutes: int = Field(validation_alias="prepTimeMinutes")
    servings: int
    oil_mode: str = Field(validation_alias="oilMode")
    oil_sprays: int | None = Field(validation_alias="oilSprays")
    oil_grams: float | None = Field(validation_alias="oilGrams")
    ingredients: list[RecipeIngredientRequest]


class RecipeUpdateRequest(RecipeCreateRequest):
    pass


class RecipeResponse(BaseModel):
    id: str
    title: str
    description: str
    image_url: str | None = Field(serialization_alias="imageUrl")
    prep_time_minutes: int = Field(serialization_alias="prepTimeMinutes")
    servings: int
    oil_mode: str = Field(serialization_alias="oilMode")
    oil_sprays: int | None = Field(serialization_alias="oilSprays")
    oil_grams: float | None = Field(serialization_alias="oilGrams")
    total_kcal: float = Field(serialization_alias="totalKcal")
    total_protein: float = Field(serialization_alias="totalProtein")
    total_fat: float = Field(serialization_alias="totalFat")
    total_carbs: float = Field(serialization_alias="totalCarbs")
    per_serving_kcal: float = Field(serialization_alias="perServingKcal")
    per_serving_protein: float = Field(serialization_alias="perServingProtein")
    per_serving_fat: float = Field(serialization_alias="perServingFat")
    per_serving_carbs: float = Field(serialization_alias="perServingCarbs")
    ingredients: list[RecipeIngredientResponse]
    created_by_user_id: str = Field(serialization_alias="createdByUserId")
    created_by_display_name: str = Field(serialization_alias="createdByDisplayName")
    created_by_email: str = Field(serialization_alias="createdByEmail")
    updated_by_user_id: str = Field(serialization_alias="updatedByUserId")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    archived_at: datetime | None = Field(serialization_alias="archivedAt")


class MealPlanItemCreateRequest(StrictRequest):
    meal_date: date = Field(validation_alias="mealDate")
    meal_slot: str = Field(validation_alias="mealSlot")
    recipe_id: str = Field(validation_alias="recipeId")
    servings: float


class MealPlanItemResponse(BaseModel):
    id: str
    owner_user_id: str = Field(serialization_alias="ownerUserId")
    meal_date: date = Field(serialization_alias="mealDate")
    meal_slot: str = Field(serialization_alias="mealSlot")
    recipe_id: str = Field(serialization_alias="recipeId")
    recipe_title: str = Field(serialization_alias="recipeTitle")
    servings: float
    kcal: float
    protein: float
    fat: float
    carbs: float
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class MealPlanTotalsResponse(BaseModel):
    kcal: float
    protein: float
    fat: float
    carbs: float


class MealPlanDayResponse(BaseModel):
    date: date
    total_kcal: float = Field(serialization_alias="totalKcal")
    total_protein: float = Field(serialization_alias="totalProtein")
    total_fat: float = Field(serialization_alias="totalFat")
    total_carbs: float = Field(serialization_alias="totalCarbs")


class MealPlanWeekResponse(BaseModel):
    owner_user_id: str = Field(serialization_alias="ownerUserId")
    week_start: date = Field(serialization_alias="weekStart")
    items: list[MealPlanItemResponse]
    days: list[MealPlanDayResponse]
    week_totals: MealPlanTotalsResponse = Field(serialization_alias="weekTotals")


class ShoppingListPantryItemRequest(StrictRequest):
    ingredient_id: str = Field(validation_alias="ingredientId")
    quantity: float


class ShoppingListExcludedPlanItemRequest(StrictRequest):
    plan_item_id: str = Field(validation_alias="planItemId")
    servings: float = Field(gt=0)


class ShoppingListGenerateRequest(StrictRequest):
    title: str
    start_date: date = Field(validation_alias="startDate")
    end_date: date = Field(validation_alias="endDate")
    excluded_plan_items: list[ShoppingListExcludedPlanItemRequest] = Field(
        default_factory=list,
        validation_alias="excludedPlanItems",
    )
    excluded_plan_item_ids: list[str] = Field(
        default_factory=list,
        validation_alias="excludedPlanItemIds",
    )
    excluded_recipe_ids: list[str] = Field(
        default_factory=list,
        validation_alias="excludedRecipeIds",
    )
    pantry_items: list[ShoppingListPantryItemRequest] = Field(
        default_factory=list,
        validation_alias="pantryItems",
    )


class ShoppingListItemSourceDetailResponse(BaseModel):
    recipe_title: str = Field(serialization_alias="recipeTitle")
    meal_date: date = Field(serialization_alias="mealDate")
    meal_slot: str = Field(serialization_alias="mealSlot")
    servings: float
    quantity: float


class ShoppingListItemResponse(BaseModel):
    id: str
    ingredient_id: str = Field(serialization_alias="ingredientId")
    ingredient_name: str = Field(serialization_alias="ingredientName")
    unit: str
    section: str
    required_quantity: float = Field(serialization_alias="requiredQuantity")
    pantry_quantity: float = Field(serialization_alias="pantryQuantity")
    final_quantity: float = Field(serialization_alias="finalQuantity")
    is_checked: bool = Field(serialization_alias="isChecked")
    source_recipes: list[str] = Field(serialization_alias="sourceRecipes")
    source_details: list[ShoppingListItemSourceDetailResponse] = Field(
        serialization_alias="sourceDetails"
    )


class ShoppingListItemUpdateRequest(StrictRequest):
    is_checked: bool = Field(validation_alias="isChecked")


class ShoppingListResponse(BaseModel):
    id: str
    owner_user_id: str = Field(serialization_alias="ownerUserId")
    title: str
    start_date: date = Field(serialization_alias="startDate")
    end_date: date = Field(serialization_alias="endDate")
    status: str
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    items: list[ShoppingListItemResponse]
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
