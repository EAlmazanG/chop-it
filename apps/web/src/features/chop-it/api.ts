import { getServerApiBaseUrl } from '@/lib/api';

import type {
  ChopItCategory,
  ChopItIngredient,
  ChopItIngredientInput,
  ChopItMealPlanItem,
  ChopItMealPlanItemInput,
  ChopItMealPlanWeek,
  ChopItRecipe,
  ChopItRecipeInput,
  ChopItShoppingList,
  ChopItShoppingListGenerateInput,
} from './types';

function chopItApiUrl(path: string): string {
  return `${getServerApiBaseUrl().replace(/\/$/, '')}/chop-it/${path.replace(/^\//, '')}`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(chopItApiUrl(path), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Chop It request failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchChopItIngredients(): Promise<ChopItIngredient[]> {
  return getJson<ChopItIngredient[]>('ingredients');
}

export async function fetchChopItCategories(): Promise<ChopItCategory[]> {
  return getJson<ChopItCategory[]>('ingredient-categories');
}

async function sendJson<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T | null> {
  const response = await fetch(chopItApiUrl(path), {
    method,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Chop It mutation failed with HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json() as Promise<T>;
}

export async function createChopItIngredient(
  input: ChopItIngredientInput,
): Promise<ChopItIngredient | null> {
  return sendJson<ChopItIngredient>('ingredients', 'POST', input);
}

export async function createChopItCategory(
  name: string,
): Promise<ChopItCategory | null> {
  return sendJson<ChopItCategory>('ingredient-categories', 'POST', { name });
}

export async function updateChopItCategory(
  id: string,
  name: string,
): Promise<ChopItCategory | null> {
  return sendJson<ChopItCategory>(`ingredient-categories/${id}`, 'PATCH', {
    name,
  });
}

export async function deleteChopItCategory(id: string): Promise<void> {
  await sendJson(`ingredient-categories/${id}`, 'DELETE');
}

export async function updateChopItIngredient(
  id: string,
  input: ChopItIngredientInput,
): Promise<ChopItIngredient | null> {
  return sendJson<ChopItIngredient>(`ingredients/${id}`, 'PATCH', input);
}

export async function deleteChopItIngredient(id: string): Promise<void> {
  await sendJson(`ingredients/${id}`, 'DELETE');
}

export async function fetchChopItRecipes(): Promise<ChopItRecipe[]> {
  return getJson<ChopItRecipe[]>('recipes');
}

export async function fetchChopItArchivedRecipes(): Promise<ChopItRecipe[]> {
  return getJson<ChopItRecipe[]>('recipes/archived');
}

export async function createChopItRecipe(
  input: ChopItRecipeInput,
): Promise<ChopItRecipe | null> {
  return sendJson<ChopItRecipe>('recipes', 'POST', input);
}

export async function updateChopItRecipe(
  id: string,
  input: ChopItRecipeInput,
): Promise<ChopItRecipe | null> {
  return sendJson<ChopItRecipe>(`recipes/${id}`, 'PATCH', input);
}

export async function archiveChopItRecipe(id: string): Promise<void> {
  await sendJson(`recipes/${id}`, 'DELETE');
}

export async function restoreChopItRecipe(
  id: string,
): Promise<ChopItRecipe | null> {
  return sendJson<ChopItRecipe>(`recipes/${id}/restore`, 'POST');
}

export async function deleteChopItRecipePermanently(id: string): Promise<void> {
  await sendJson(`recipes/${id}/permanent`, 'DELETE');
}

export async function fetchChopItWeekPlan(input: {
  weekStart: string;
}): Promise<ChopItMealPlanWeek> {
  const params = new URLSearchParams({ weekStart: input.weekStart });
  return getJson<ChopItMealPlanWeek>(`plans/week?${params.toString()}`);
}

export async function createChopItMealPlanItem(
  input: ChopItMealPlanItemInput,
): Promise<ChopItMealPlanItem | null> {
  return sendJson<ChopItMealPlanItem>('plans/items', 'POST', input);
}

export async function deleteChopItMealPlanItem(id: string): Promise<void> {
  await sendJson(`plans/items/${id}`, 'DELETE');
}

export async function fetchChopItCurrentShoppingList(): Promise<ChopItShoppingList | null> {
  return getJson<ChopItShoppingList | null>('shopping-lists/current');
}

export async function fetchChopItArchivedShoppingLists(): Promise<
  ChopItShoppingList[]
> {
  return getJson<ChopItShoppingList[]>('shopping-lists/archived');
}

export async function generateChopItShoppingList(
  input: ChopItShoppingListGenerateInput,
): Promise<ChopItShoppingList | null> {
  return sendJson<ChopItShoppingList>('shopping-lists/generate', 'POST', input);
}

export async function completeChopItShoppingList(
  id: string,
): Promise<ChopItShoppingList | null> {
  return sendJson<ChopItShoppingList>(`shopping-lists/${id}/complete`, 'POST');
}

export async function deleteChopItShoppingList(id: string): Promise<void> {
  await sendJson(`shopping-lists/${id}`, 'DELETE');
}

export async function recoverChopItShoppingList(
  id: string,
): Promise<ChopItShoppingList | null> {
  return sendJson<ChopItShoppingList>(`shopping-lists/${id}/recover`, 'POST');
}

export async function updateChopItShoppingListItem(
  id: string,
  input: { isChecked: boolean },
): Promise<ChopItShoppingList['items'][number] | null> {
  return sendJson<ChopItShoppingList['items'][number]>(
    `shopping-lists/items/${id}`,
    'PATCH',
    input,
  );
}
