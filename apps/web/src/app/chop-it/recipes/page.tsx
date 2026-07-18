import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { CloseIcon } from '@/components/action-icons';
import { AppHeader } from '@/components/app-header';
import { ChopItSectionHeader } from '@/components/chop-it-section-header';
import { EditIcon } from '@/components/edit-icon';
import {
  archiveChopItRecipe,
  createChopItRecipe,
  deleteChopItRecipePermanently,
  fetchChopItArchivedRecipes,
  fetchChopItCategories,
  fetchChopItIngredients,
  fetchChopItRecipes,
  restoreChopItRecipe,
  updateChopItRecipe,
} from '@/features/chop-it/api';
import { RecipeEditorModal } from './recipe-editor-modal';
import { SprayHelpDisclosure } from './spray-help-disclosure';
import type {
  ChopItCategory,
  ChopItIngredient,
  ChopItRecipe,
  ChopItRecipeIngredient,
  ChopItRecipeInput,
} from '@/features/chop-it/types';

async function createRecipeAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await createChopItRecipe(recipeInputFromForm(formData));
  revalidatePath('/chop-it/recipes');
  redirect(recipesHref('', actingUserId));
}

async function updateRecipeAction(formData: FormData) {
  'use server';

  const recipeId = String(formData.get('id') ?? '');
  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await updateChopItRecipe(recipeId, recipeInputFromForm(formData));
  revalidatePath('/chop-it/recipes');
  redirect(recipeDetailHref(recipeId, '', actingUserId));
}

async function archiveRecipeAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await archiveChopItRecipe(String(formData.get('id') ?? ''));
  revalidatePath('/chop-it/recipes');
  redirect(recipesHref('', actingUserId));
}

async function restoreRecipeAction(formData: FormData) {
  'use server';

  await restoreChopItRecipe(String(formData.get('id') ?? ''));
  revalidatePath('/chop-it/recipes');
}

async function deleteRecipePermanentlyAction(formData: FormData) {
  'use server';

  await deleteChopItRecipePermanently(String(formData.get('id') ?? ''));
  revalidatePath('/chop-it/recipes');
}

async function getIngredients(): Promise<ChopItIngredient[]> {
  return fetchChopItIngredients();
}

async function getRecipes(): Promise<ChopItRecipe[]> {
  try {
    return await fetchChopItRecipes();
  } catch {
    return [];
  }
}

async function getArchivedRecipes(): Promise<ChopItRecipe[]> {
  try {
    return await fetchChopItArchivedRecipes();
  } catch {
    return [];
  }
}

async function getCategories(): Promise<ChopItCategory[]> {
  try {
    return await fetchChopItCategories();
  } catch {
    return [];
  }
}

export default async function ChopItRecipesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams?: Promise<{
    actingUserId?: string;
    archived?: string;
    create?: string;
    edit?: string;
    q?: string;
    recipeId?: string;
    sort?: string;
  }>;
}) {
  const searchParams = (await searchParamsPromise) ?? {};

  const [categories, ingredients, recipes, archivedRecipes] = await Promise.all(
    [getCategories(), getIngredients(), getRecipes(), getArchivedRecipes()],
  );
  const query = searchParams.q ?? '';
  const sort = recipeSortFromParam(searchParams.sort);
  const visibleRecipes = sortRecipes(filterRecipes(recipes, query), sort);
  const selectedRecipe =
    recipes.find((recipe) => recipe.id === searchParams.recipeId) ?? null;
  const editingRecipe =
    recipes.find((recipe) => recipe.id === searchParams.edit) ?? null;
  const actingUserId = searchParams.actingUserId;
  const oilReference = ingredients.find((ingredient) => ingredient.isOil);

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <AppHeader
        section="Chop It!"
        sectionHref={chopItHomeHref(actingUserId)}
      />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <ChopItSectionHeader
          aside={
            <div className="rounded-md border border-zinc-200 px-4 py-3 text-right">
              <p className="text-2xl font-semibold tabular-nums">
                {recipes.length}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                recipes
              </p>
            </div>
          }
          description="Shared catalog with ingredients, oil, servings, and calculated macros."
          icon="recipes"
          title="Recipes"
        />

        <RecipeFilters actingUserId={actingUserId} query={query} sort={sort} />
        <div className="mb-5 flex justify-end">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            href={recipesArchivedHref(query, actingUserId)}
          >
            Archived
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              {archivedRecipes.length}
            </span>
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRecipes.length > 0 ? (
            visibleRecipes.map((recipe) => (
              <RecipeCard
                actingUserId={actingUserId}
                key={recipe.id}
                query={query}
                recipe={recipe}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>

        <Link
          aria-label="Add recipe"
          className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-zinc-950 text-3xl font-semibold leading-none text-white shadow-lg transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          href={recipeCreateHref(searchParams.q ?? '', actingUserId)}
        >
          +
        </Link>
        {searchParams.create === '1' ? (
          <RecipeEditorModal
            action={createRecipeAction}
            actingUserId={actingUserId}
            categories={categories}
            closeHref={recipesHref(query, actingUserId)}
            ingredients={ingredients}
            mode="create"
            oilReference={oilReference}
          />
        ) : null}
        {selectedRecipe ? (
          <RecipeDetailModal
            categories={categories}
            ingredients={ingredients}
            actingUserId={actingUserId}
            oilReference={oilReference}
            query={query}
            recipe={selectedRecipe}
          />
        ) : null}
        {editingRecipe ? (
          <RecipeEditorModal
            action={updateRecipeAction}
            actingUserId={actingUserId}
            archiveAction={archiveRecipeAction}
            categories={categories}
            closeHref={recipeDetailHref(editingRecipe.id, query, actingUserId)}
            ingredients={ingredients}
            mode="edit"
            oilReference={oilReference}
            recipe={editingRecipe}
          />
        ) : null}
        {searchParams.archived === '1' ? (
          <ArchivedRecipesModal
            actingUserId={actingUserId}
            query={query}
            recipes={archivedRecipes}
          />
        ) : null}
      </section>
    </main>
  );
}

function RecipeFilters({
  actingUserId,
  query,
  sort,
}: {
  actingUserId?: string;
  query: string;
  sort: RecipeSort;
}) {
  return (
    <form
      action="/chop-it/recipes#recipe-search"
      className="mb-4 grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-[1fr_auto]"
      id="recipe-search"
    >
      {actingUserId ? (
        <input name="actingUserId" type="hidden" value={actingUserId} />
      ) : null}
      {sort ? <input name="sort" type="hidden" value={sort} /> : null}
      <Field label="Search recipes">
        <input
          className={inputClassName}
          defaultValue={query}
          name="q"
          placeholder="Chicken..."
        />
      </Field>
      <button className={`${primaryButtonClassName} self-end`}>Search</button>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Sort
        </span>
        <Link
          aria-label={
            sort === 'creator'
              ? 'Creator sorting active'
              : 'Sort by creator'
          }
          className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition hover:border-zinc-950 ${
            sort === 'creator'
              ? 'border-zinc-950 text-zinc-950'
              : 'border-zinc-200 text-zinc-500'
          }`}
          href={
            sort === 'creator'
              ? recipesHref(query, actingUserId, 'recipe-search')
              : recipesSortHref(query, 'creator', actingUserId, 'recipe-search')
          }
        >
          Creator{sort === 'creator' ? ' ↑' : ''}
        </Link>
      </div>
    </form>
  );
}

function RecipeCard({
  actingUserId,
  query,
  recipe,
}: {
  actingUserId?: string;
  query: string;
  recipe: ChopItRecipe;
}) {
  return (
    <Link
      className="grid min-h-44 gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-950 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
      href={recipeDetailHref(recipe.id, query, actingUserId)}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-lg font-semibold leading-6 text-zinc-950">
            {recipe.title}
          </h2>
          <span
            className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-zinc-500"
            title={`Created by ${recipeCreatorLabel(recipe)}`}
          >
            {recipeCreatorLabel(recipe)}
          </span>
        </div>
        <p className="mt-2 max-h-10 overflow-hidden text-sm leading-5 text-zinc-500">
          {recipe.description || 'No description'}
        </p>
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-3 gap-2">
          <RecipeFact label="Kcal" value={`${round(recipe.perServingKcal)}`} />
          <RecipeFact label="Time" value={`${recipe.prepTimeMinutes} min`} />
          <RecipeFact label="Servings" value={`${recipe.servings}`} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MacroFact
            label="Protein"
            tone="protein"
            value={`${round(recipe.perServingProtein)} g`}
          />
          <MacroFact
            label="Fat"
            tone="fat"
            value={`${round(recipe.perServingFat)} g`}
          />
          <MacroFact
            label="Carbs"
            tone="carb"
            value={`${round(recipe.perServingCarbs)} g`}
          />
        </div>
      </div>
    </Link>
  );
}

function RecipeDetailModal({
  actingUserId,
  categories,
  ingredients,
  oilReference,
  query,
  recipe,
}: {
  actingUserId?: string;
  categories: ChopItCategory[];
  ingredients: ChopItIngredient[];
  oilReference?: ChopItIngredient;
  query: string;
  recipe: ChopItRecipe;
}) {
  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const hasOilDuplicationRisk = recipeHasOilDuplicationRisk(
    recipe,
    ingredientById,
  );
  const categoryById = new Map(
    categories.map((category, index) => [
      category.id,
      { index, name: category.name },
    ]),
  );
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Recipe
              </p>
              <span
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-zinc-500"
                title={`Created by ${recipeCreatorLabel(recipe)}`}
              >
                {recipeCreatorLabel(recipe)}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {recipe.title}
            </h2>
          </div>
          <Link
            aria-label="Close"
            className={modalCloseClassName}
            href={recipesHref(query, actingUserId)}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>

        <div className="grid gap-5 p-4">
          <MacroSummary recipe={recipe} />
          <div>
            <p className="text-sm font-semibold">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
              {recipe.description || 'No description'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <DetailItem label="Minutes" value={`${recipe.prepTimeMinutes}`} />
            <DetailItem label="Servings" value={`${recipe.servings}`} />
            <DetailItem
              action={
                recipe.oilMode === 'spray' ? (
                  <SprayHelpDisclosure
                    gramsPerSpray={oilReference?.gramsPerSpray ?? 1}
                  />
                ) : null
              }
              label="Oil"
              value={oilLabel(recipe)}
            />
          </div>
          {hasOilDuplicationRisk ? (
            <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="font-semibold">
                  Oil may be counted twice.
                </p>
                <p className="mt-1 text-xs leading-5">
                  If oil is already an ingredient, set the oil adjustment to
                  &quot;No oil&quot;.
                </p>
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-sm font-semibold">Ingredients</p>
            <div className="mt-2 grid gap-2">
              {recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient) => {
                  const catalogIngredient = ingredientById.get(
                    ingredient.ingredientId,
                  );
                  const category = catalogIngredient
                    ? categoryById.get(catalogIngredient.secondaryCategoryId)
                    : undefined;
                  return (
                    <RecipeIngredientDetailRow
                      ingredient={catalogIngredient}
                      key={ingredient.ingredientId}
                      quantity={ingredient.quantity}
                      categoryIndex={category?.index}
                      categoryName={category?.name}
                      fallbackName="Ingredient not found"
                    />
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                  No ingredients.
                </p>
              )}
            </div>
          </div>
          {recipe.imageUrl ? (
            <a
              className="text-sm font-semibold underline"
              href={recipe.imageUrl}
            >
              View image
            </a>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <Link
              aria-label={`Edit ${recipe.title}`}
              className={editIconButtonClassName}
              href={recipeEditHref(recipe.id, query, actingUserId)}
            >
              <EditIcon />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function RecipeIngredientDetailRow({
  fallbackName,
  categoryIndex,
  categoryName,
  ingredient,
  quantity,
}: {
  fallbackName: string;
  categoryIndex?: number;
  categoryName?: string;
  ingredient?: ChopItIngredient;
  quantity: number;
}) {
  const nutrition = ingredient
    ? {
        kcal: (ingredient.kcalPer100 * quantity) / 100,
        protein: (ingredient.proteinPer100 * quantity) / 100,
        fat: (ingredient.fatPer100 * quantity) / 100,
        carbs: (ingredient.carbsPer100 * quantity) / 100,
      }
    : { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="min-w-0">
        <p className="truncate text-[0.8rem] font-semibold leading-5 sm:text-sm">
          {ingredient?.name ?? fallbackName}
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-[0.65rem] leading-tight text-zinc-500 sm:mt-1 sm:gap-1.5 sm:text-xs">
          {ingredient ? (
            <>
              <span className={tagPillClassName(ingredient.primaryMacroTag)}>
                {macroTagLabel(ingredient.primaryMacroTag)}
              </span>
              <RecipeCategoryPill
                index={categoryIndex ?? 0}
                label={categoryName ?? 'No tag'}
              />
            </>
          ) : null}
          <span className="shrink-0 tabular-nums">
            {round(quantity)} {ingredient?.unit ?? ''}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right text-[0.62rem] tabular-nums leading-tight text-zinc-500 sm:text-xs">
        <p className="font-semibold text-zinc-950">
          {round(nutrition.kcal)} kcal
        </p>
        <p className="mt-0.5">
          {round(nutrition.protein)}P · {round(nutrition.fat)}G ·{' '}
          {round(nutrition.carbs)}H
        </p>
      </div>
    </div>
  );
}

function MacroSummary({ recipe }: { recipe: ChopItRecipe }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric
        label="Kcal"
        value={`${round(recipe.perServingKcal)} kcal/serving`}
      />
      <Metric label="Prot." value={`${round(recipe.perServingProtein)} g`} />
      <Metric label="Fat" value={`${round(recipe.perServingFat)} g`} />
      <Metric label="Carbs" value={`${round(recipe.perServingCarbs)} g`} />
    </div>
  );
}

function RecipeFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function MacroFact({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'carb' | 'fat' | 'protein';
  value: string;
}) {
  const className =
    tone === 'protein'
      ? 'bg-emerald-50 text-emerald-800'
      : tone === 'fat'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-sky-50 text-sky-800';
  return (
    <div className={`rounded-md px-3 py-2 ${className}`}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DetailItem({
  action,
  label,
  value,
}: {
  action?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-200 px-2 py-2 sm:px-3">
      <p className="truncate text-[0.65rem] leading-tight text-zinc-500 sm:text-xs">
        {label}
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-1.5">
        <p className="truncate text-[0.8rem] font-semibold leading-tight sm:text-sm">
          {value}
        </p>
        {action}
      </div>
    </div>
  );
}

function macroTagLabel(tag: ChopItIngredient['primaryMacroTag']): string {
  if (tag === 'protein') {
    return 'Protein';
  }
  if (tag === 'fat') {
    return 'Fat';
  }
  return 'Carbs';
}

function tagPillClassName(tag: ChopItIngredient['primaryMacroTag']): string {
  if (tag === 'protein') {
    return 'rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 sm:px-2';
  }
  if (tag === 'fat') {
    return 'rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700 sm:px-2';
  }
  return 'rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700 sm:px-2';
}

function RecipeCategoryPill({
  index,
  label,
}: {
  index: number;
  label: string;
}) {
  const palette = categoryPalette[index % categoryPalette.length];
  return (
    <span
      className="max-w-24 truncate rounded-full border px-1.5 py-0.5 font-semibold sm:max-w-none sm:px-2"
      style={{
        backgroundColor: palette.background,
        borderColor: palette.border,
        color: palette.text,
      }}
      title={label}
    >
      {label}
    </span>
  );
}

function oilLabel(recipe: ChopItRecipe): string {
  if (recipe.oilMode === 'spray') {
    return `${recipe.oilSprays ?? 0} sprays`;
  }
  if (recipe.oilMode === 'grams') {
    return `${recipe.oilGrams ?? 0} g`;
  }
  return 'No oil';
}

type RecipeSort = 'creator' | '';

function recipeSortFromParam(value?: string): RecipeSort {
  return value === 'creator' ? 'creator' : '';
}

function sortRecipes(
  recipes: ChopItRecipe[],
  sort: RecipeSort,
): ChopItRecipe[] {
  if (sort !== 'creator') {
    return recipes;
  }
  return [...recipes].sort((left, right) => {
    const creatorCompare = recipeCreatorLabel(left).localeCompare(
      recipeCreatorLabel(right),
      'es',
    );
    return creatorCompare || left.title.localeCompare(right.title, 'es');
  });
}

function recipeCreatorLabel(recipe: ChopItRecipe): string {
  return (
    recipe.createdByDisplayName ||
    recipe.createdByEmail ||
    recipe.createdByUserId
  );
}

function recipeHasOilDuplicationRisk(
  recipe: ChopItRecipe,
  ingredientById: Map<string, ChopItIngredient>,
): boolean {
  if (recipe.oilMode === 'none') {
    return false;
  }
  return recipe.ingredients.some((recipeIngredient) => {
    const ingredient = ingredientById.get(recipeIngredient.ingredientId);
    return ingredient
      ? normalizeSearchText(ingredient.name).includes('oil')
      : false;
  });
}

function ArchivedRecipesModal({
  actingUserId,
  query,
  recipes,
}: {
  actingUserId?: string;
  query: string;
  recipes: ChopItRecipe[];
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Archive
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Archived recipes
            </h2>
          </div>
          <Link
            aria-label="Close"
            className={modalCloseClassName}
            href={recipesHref(query, actingUserId)}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>
        <div className="grid gap-3 p-4">
          {recipes.length > 0 ? (
            recipes.map((recipe) => (
              <form
                action={restoreRecipeAction}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4"
                key={recipe.id}
              >
                <input name="id" type="hidden" value={recipe.id} />
                <div>
                  <p className="text-sm font-semibold">{recipe.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {round(recipe.perServingKcal)} kcal/serving
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    aria-label={`Restore ${recipe.title}`}
                    className={secondaryButtonClassName}
                  >
                    Restore
                  </button>
                  <button
                    aria-label={`Delete ${recipe.title} permanently`}
                    className={dangerButtonClassName}
                    formAction={deleteRecipePermanentlyAction}
                  >
                    Delete
                  </button>
                </div>
              </form>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 px-5 py-10 text-center">
              <p className="text-sm font-semibold">No archived recipes</p>
              <p className="mt-2 text-sm text-zinc-500">
                Archived recipes will appear here after you hide them from the
                catalog.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-5 py-12 text-center">
      <p className="text-sm font-semibold">No recipes</p>
      <p className="mt-2 text-sm text-zinc-500">
        Create your first recipe to start planning the week.
      </p>
    </div>
  );
}

const inputClassName =
  'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const primaryButtonClassName =
  'inline-flex h-11 w-fit items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const secondaryButtonClassName =
  'h-11 rounded-md border border-zinc-950 px-4 text-sm font-semibold transition hover:bg-zinc-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const editIconButtonClassName =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const dangerButtonClassName =
  'h-11 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30';
const modalCloseClassName =
  'grid size-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';

const categoryPalette = [
  { background: '#f4f4f5', border: '#d4d4d8', text: '#3f3f46' },
  { background: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { background: '#dcfce7', border: '#86efac', text: '#166534' },
  { background: '#e0f2fe', border: '#7dd3fc', text: '#075985' },
  { background: '#fae8ff', border: '#e879f9', text: '#86198f' },
  { background: '#ffe4e6', border: '#fda4af', text: '#9f1239' },
  { background: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' },
  { background: '#ccfbf1', border: '#5eead4', text: '#115e59' },
];

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      {children}
    </label>
  );
}

function recipeInputFromForm(formData: FormData): ChopItRecipeInput {
  return {
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    imageUrl: nullableString(formData.get('imageUrl')),
    prepTimeMinutes: Number(formData.get('prepTimeMinutes') ?? 0),
    servings: Number(formData.get('servings') ?? 1),
    oilMode: String(
      formData.get('oilMode') ?? 'none',
    ) as ChopItRecipeInput['oilMode'],
    oilSprays: nullableNumber(formData.get('oilSprays')),
    oilGrams: nullableNumber(formData.get('oilGrams')),
    ingredients: ingredientInputsFromForm(formData),
  };
}

function ingredientInputsFromForm(
  formData: FormData,
): ChopItRecipeIngredient[] {
  const ingredientIds = formData.getAll('ingredientId');
  const quantities = formData.getAll('quantity');
  return ingredientIds.flatMap((ingredientId, index) => {
    const parsedIngredientId = String(ingredientId ?? '').trim();
    const quantity = Number(quantities[index] ?? 0);
    if (!parsedIngredientId || quantity <= 0) {
      return [];
    }
    return [{ ingredientId: parsedIngredientId, quantity }];
  });
}

function nullableString(value: FormDataEntryValue | null): string | null {
  const parsed = String(value ?? '').trim();
  return parsed.length > 0 ? parsed : null;
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  const parsed = String(value ?? '').trim();
  return parsed.length > 0 ? Number(parsed) : null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function filterRecipes(recipes: ChopItRecipe[], query: string): ChopItRecipe[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return recipes;
  }
  return recipes.filter((recipe) =>
    normalizeSearchText(
      [recipe.title, recipe.description, recipeCreatorLabel(recipe)].join(' '),
    ).includes(normalizedQuery),
  );
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function recipesHref(
  query: string,
  actingUserId?: string,
  hash?: string,
): string {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query);
  }
  setActingUserParam(params, actingUserId);
  const suffix = params.toString();
  return withHash(
    suffix ? `/chop-it/recipes?${suffix}` : '/chop-it/recipes',
    hash,
  );
}

function recipesSortHref(
  query: string,
  sort: RecipeSort,
  actingUserId?: string,
  hash?: string,
): string {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query);
  }
  if (sort) {
    params.set('sort', sort);
  }
  setActingUserParam(params, actingUserId);
  const suffix = params.toString();
  return withHash(
    suffix ? `/chop-it/recipes?${suffix}` : '/chop-it/recipes',
    hash,
  );
}

function recipesArchivedHref(query: string, actingUserId?: string): string {
  const params = new URLSearchParams({ archived: '1' });
  if (query.trim()) {
    params.set('q', query);
  }
  setActingUserParam(params, actingUserId);
  return `/chop-it/recipes?${params.toString()}`;
}

function recipeCreateHref(query: string, actingUserId?: string): string {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query);
  }
  params.set('create', '1');
  setActingUserParam(params, actingUserId);
  return `/chop-it/recipes?${params.toString()}`;
}

function recipeDetailHref(
  recipeId: string,
  query: string,
  actingUserId?: string,
): string {
  const params = new URLSearchParams({ recipeId });
  if (query.trim()) {
    params.set('q', query);
  }
  setActingUserParam(params, actingUserId);
  return `/chop-it/recipes?${params.toString()}`;
}

function recipeEditHref(
  recipeId: string,
  query: string,
  actingUserId?: string,
): string {
  const params = new URLSearchParams({ edit: recipeId });
  if (query.trim()) {
    params.set('q', query);
  }
  setActingUserParam(params, actingUserId);
  return `/chop-it/recipes?${params.toString()}`;
}

function chopItHomeHref(actingUserId?: string): string {
  if (!actingUserId) {
    return '/chop-it';
  }
  return `/chop-it?actingUserId=${encodeURIComponent(actingUserId)}`;
}

function setActingUserParam(
  params: URLSearchParams,
  actingUserId?: string,
): void {
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
}

function withHash(href: string, hash?: string): string {
  return hash ? `${href}#${hash}` : href;
}
