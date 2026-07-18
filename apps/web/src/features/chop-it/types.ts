export type ChopItCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ChopItIngredient = {
  id: string;
  name: string;
  primaryMacroTag: 'protein' | 'fat' | 'carb';
  secondaryCategoryId: string;
  unit: 'g' | 'ml';
  kcalPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  isOil?: boolean;
  gramsPerSpray?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ChopItIngredientInput = {
  name: string;
  primaryMacroTag: 'protein' | 'fat' | 'carb';
  secondaryCategoryId: string;
  unit: 'g' | 'ml';
  kcalPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  gramsPerSpray?: number | null;
};

export type ChopItRecipeIngredient = {
  ingredientId: string;
  quantity: number;
};

export type ChopItRecipe = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  servings: number;
  oilMode: 'none' | 'spray' | 'grams';
  oilSprays: number | null;
  oilGrams: number | null;
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  perServingKcal: number;
  perServingProtein: number;
  perServingFat: number;
  perServingCarbs: number;
  ingredients: ChopItRecipeIngredient[];
  createdByUserId: string;
  createdByDisplayName: string;
  createdByEmail: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ChopItRecipeInput = {
  title: string;
  description: string;
  imageUrl: string | null;
  prepTimeMinutes: number;
  servings: number;
  oilMode: 'none' | 'spray' | 'grams';
  oilSprays: number | null;
  oilGrams: number | null;
  ingredients: ChopItRecipeIngredient[];
};

export type ChopItMealPlanItem = {
  id: string;
  ownerUserId: string;
  mealDate: string;
  mealSlot: string;
  recipeId: string;
  recipeTitle: string;
  servings: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt: string;
  updatedAt: string;
};

export type ChopItMealPlanDay = {
  date: string;
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
};

export type ChopItMealPlanWeek = {
  ownerUserId: string;
  weekStart: string;
  items: ChopItMealPlanItem[];
  days: ChopItMealPlanDay[];
  weekTotals: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
};

export type ChopItMealPlanItemInput = {
  mealDate: string;
  mealSlot: string;
  recipeId: string;
  servings: number;
};

export type ChopItShoppingListItem = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  section: 'missing' | 'pantry' | 'recipe_excluded' | 'bought';
  requiredQuantity: number;
  pantryQuantity: number;
  finalQuantity: number;
  isChecked: boolean;
  sourceRecipes: string[];
  sourceDetails: ChopItShoppingListItemSourceDetail[];
};

export type ChopItShoppingListItemSourceDetail = {
  recipeTitle: string;
  mealDate: string;
  mealSlot: string;
  servings: number;
  quantity: number;
};

export type ChopItShoppingList = {
  id: string;
  ownerUserId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'current' | 'archived';
  completedAt: string | null;
  items: ChopItShoppingListItem[];
  createdAt: string;
  updatedAt: string;
};

export type ChopItShoppingListGenerateInput = {
  title: string;
  startDate: string;
  endDate: string;
  excludedPlanItems?: Array<{ planItemId: string; servings: number }>;
  excludedPlanItemIds?: string[];
  excludedRecipeIds: string[];
  pantryItems: Array<{ ingredientId: string; quantity: number }>;
};
