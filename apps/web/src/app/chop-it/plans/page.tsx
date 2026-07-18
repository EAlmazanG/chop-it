import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { CloseIcon, ShoppingListIcon } from '@/components/action-icons';
import { AppHeader } from '@/components/app-header';
import { ChopItSectionHeader } from '@/components/chop-it-section-header';
import {
  createChopItMealPlanItem,
  deleteChopItMealPlanItem,
  fetchChopItIngredients,
  fetchChopItRecipes,
  fetchChopItWeekPlan,
  generateChopItShoppingList,
} from '@/features/chop-it/api';
import type {
  ChopItIngredient,
  ChopItMealPlanDay,
  ChopItMealPlanItem,
  ChopItMealPlanWeek,
  ChopItRecipe,
} from '@/features/chop-it/types';

import { PantryQuantityControl } from './pantry-quantity-control';
import { RecipeExclusionControl } from './recipe-exclusion-control';
import { ShoppingDaysStep } from './shopping-days-step';

type PlansSearchParams = {
  [key: string]: string | string[] | undefined;
  addDate?: string;
  addSlot?: string;
  day?: string | string[];
  excludedPlanItemId?: string | string[];
  excludedRecipeId?: string | string[];
  shoppingStep?: string | string[];
  weekStart?: string | string[];
};

type PlansPageProps = {
  searchParams?: Promise<PlansSearchParams>;
};

const mealSlots = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack_morning', label: 'Morning snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack_afternoon', label: 'Afternoon snack' },
  { id: 'dinner', label: 'Dinner' },
];

async function createPlanItemAction(formData: FormData) {
  'use server';

  const weekStart = String(formData.get('weekStart') ?? '');
  await createChopItMealPlanItem({
    mealDate: String(formData.get('mealDate') ?? ''),
    mealSlot: String(formData.get('mealSlot') ?? ''),
    recipeId: String(formData.get('recipeId') ?? ''),
    servings: Number(formData.get('servings') ?? 1),
  });
  revalidatePath('/chop-it/plans');
  redirect(planHref(weekStart || currentWeekStart()));
}

async function deletePlanItemAction(formData: FormData) {
  'use server';

  await deleteChopItMealPlanItem(String(formData.get('id') ?? ''));
  revalidatePath('/chop-it/plans');
}

async function generateShoppingListAction(formData: FormData) {
  'use server';

  await generateChopItShoppingList({
    title: String(formData.get('title') ?? '').trim(),
    startDate: String(formData.get('startDate') ?? ''),
    endDate: String(formData.get('endDate') ?? ''),
    excludedPlanItems: excludedPlanItemsFromForm(formData),
    excludedPlanItemIds: uniqueStrings(
      formData.getAll('excludedPlanItemId').map(String),
    ),
    excludedRecipeIds: uniqueStrings(
      formData.getAll('excludedRecipeId').map(String),
    ),
    pantryItems: pantryItemsFromForm(formData),
  });
  revalidatePath('/chop-it/shopping-lists');
  redirect(shoppingListsHref());
}

async function getRecipes(): Promise<ChopItRecipe[]> {
  try {
    return await fetchChopItRecipes();
  } catch {
    return [];
  }
}

async function getIngredients(): Promise<ChopItIngredient[]> {
  return fetchChopItIngredients();
}

async function getWeekPlan(input: {
  ownerUserId: string;
  weekStart: string;
}): Promise<ChopItMealPlanWeek> {
  try {
    return await fetchChopItWeekPlan({
      weekStart: input.weekStart,
    });
  } catch {
    return emptyWeek(input.ownerUserId, input.weekStart);
  }
}

export default async function ChopItPlansPage({
  searchParams: searchParamsPromise,
}: PlansPageProps) {
  const searchParams = (await searchParamsPromise) ?? {};

  const weekStart = stringParam(searchParams.weekStart) ?? currentWeekStart();
  const actingUserId = undefined;
  const [recipes, ingredients] = await Promise.all([
    getRecipes(),
    getIngredients(),
  ]);
  const plan = await getWeekPlan({
    ownerUserId: '00000000-0000-4000-8000-000000000001',
    weekStart,
  });
  const shoppingStep = shoppingStepFromParam(
    stringParam(searchParams.shoppingStep),
  );
  const shoppingDays = buildShoppingDays(weekStart, plan);
  const selectedShoppingDays = uniqueStrings(getParamArray(searchParams.day))
    .filter(isIsoDate)
    .sort((left, right) => dateOrdinal(left) - dateOrdinal(right))
    .slice(0, 14);
  const extraSelectedWeekStarts = uniqueStrings(
    selectedShoppingDays.map((day) => weekStartForDate(day)),
  ).filter((selectedWeekStart) => selectedWeekStart !== weekStart);
  const extraSelectedPlans =
    shoppingStep !== null
      ? await Promise.all(
          extraSelectedWeekStarts.map((selectedWeekStart) =>
            getWeekPlan({
              ownerUserId: '00000000-0000-4000-8000-000000000001',
              weekStart: selectedWeekStart,
            }),
          ),
        )
      : [];
  const selectedShoppingDayData = mergeShoppingDays(
    [plan, ...extraSelectedPlans].flatMap((selectedPlan) =>
      buildShoppingDays(selectedPlan.weekStart, selectedPlan),
    ),
  );
  const excludedRecipeIds = uniqueStrings(
    getParamArray(searchParams.excludedRecipeId),
  );
  const excludedPlanItemIds = uniqueStrings(
    getParamArray(searchParams.excludedPlanItemId),
  );
  const excludedPlanItemServings =
    excludedPlanItemServingsFromParams(searchParams);
  const addDate = plan.days.some((day) => day.date === searchParams.addDate)
    ? searchParams.addDate
    : null;
  const addSlot =
    typeof searchParams.addSlot === 'string' &&
    mealSlots.some((slot) => slot.id === searchParams.addSlot)
      ? searchParams.addSlot
      : 'lunch';
  const sortedRecipes = [...recipes].sort((left, right) =>
    left.title.localeCompare(right.title),
  );

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <AppHeader
        section="Chop It!"
        sectionHref={chopItHomeHref(actingUserId)}
      />
      <section className="mx-auto max-w-[96rem] px-5 py-8 sm:px-8">
        <ChopItSectionHeader
          aside={
            <div className="grid gap-3">
              <WeekTotal plan={plan} />
              <WeekAverage plan={plan} />
            </div>
          }
          description="Current week, meals by day, and nutrition totals."
          icon="plans"
          title="Weekly plan"
        />

        <PlanToolbar actingUserId={actingUserId} weekStart={weekStart} />
        <Link
          aria-label="Generate shopping list"
          className="fixed bottom-6 right-6 z-30 grid size-14 place-items-center rounded-full bg-zinc-950 text-white shadow-xl shadow-zinc-950/20 transition hover:scale-105 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 sm:bottom-8 sm:right-8"
          href={shoppingWizardHref({ actingUserId, step: 'days', weekStart })}
          title="Generate shopping list"
        >
          <ShoppingListIcon className="size-6" />
        </Link>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {plan.days.map((day) => (
            <DayColumn
              actingUserId={actingUserId}
              day={day}
              items={plan.items.filter((item) => item.mealDate === day.date)}
              key={day.date}
              weekStart={weekStart}
            />
          ))}
        </div>
        {addDate ? (
          <MealPickerModal
            actingUserId={actingUserId}
            day={addDate}
            recipes={sortedRecipes}
            selectedSlotId={addSlot}
            weekStart={weekStart}
          />
        ) : null}
        {shoppingStep ? (
          <ShoppingWizardModal
            actingUserId={actingUserId}
            days={shoppingDays}
            excludedPlanItemIds={excludedPlanItemIds}
            excludedPlanItemServings={excludedPlanItemServings}
            excludedRecipeIds={excludedRecipeIds}
            ingredients={ingredients}
            recipes={recipes}
            selectedDayData={selectedShoppingDayData}
            selectedDays={selectedShoppingDays}
            step={shoppingStep}
            weekStart={weekStart}
          />
        ) : null}
      </section>
    </main>
  );
}

function PlanToolbar({
  actingUserId,
  weekStart,
}: {
  actingUserId?: string;
  weekStart: string;
}) {
  const previousWeek = dateFromOrdinal(dateOrdinal(weekStart) - 7);
  const nextWeek = dateFromOrdinal(dateOrdinal(weekStart) + 7);
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <Link
          aria-label="Previous week"
          className={weekArrowClassName}
          href={planHref(previousWeek, actingUserId)}
          scroll={false}
        >
          ←<span className="hidden sm:inline">Previous</span>
        </Link>
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Week
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
            {formatWeekRange(weekStart)}
          </p>
        </div>
        <Link
          aria-label="Next week"
          className={weekArrowClassName}
          href={planHref(nextWeek, actingUserId)}
          scroll={false}
        >
          <span className="hidden sm:inline">Next</span>→
        </Link>
      </div>
    </div>
  );
}

function DayColumn({
  actingUserId,
  day,
  items,
  weekStart,
}: {
  actingUserId?: string;
  day: ChopItMealPlanDay;
  items: ChopItMealPlanItem[];
  weekStart: string;
}) {
  const sortedItems = [...items].sort(
    (left, right) =>
      mealSlotIndex(left.mealSlot) - mealSlotIndex(right.mealSlot),
  );
  const isWeekendDay = isWeekend(day.date);
  const addButtonClassName =
    sortedItems.length > 0
      ? 'mt-3 inline-flex h-9 items-center justify-center rounded-md text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950'
      : 'mt-3 inline-flex h-10 items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm font-semibold text-zinc-500 transition hover:border-zinc-950 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';
  return (
    <section
      className={`flex min-h-[20rem] w-full flex-none flex-col rounded-lg border border-zinc-200 p-3 sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)] xl:basis-[calc((100%-2.25rem)/4)] 2xl:basis-[calc((100%-4.5rem)/7)] ${
        isWeekendDay ? 'bg-zinc-50/80' : 'bg-white'
      }`}
    >
      <div className="border-b border-zinc-100 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{weekdayName(day.date)}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {formatShortDate(day.date)}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <DayMetric label="Kcal" value={round(day.totalKcal)} />
          <DayMetric label="P" value={round(day.totalProtein)} />
          <DayMetric label="F" value={round(day.totalFat)} />
          <DayMetric label="C" value={round(day.totalCarbs)} />
        </div>
      </div>

      <div className="mt-3 grid flex-1 gap-2">
        {sortedItems.length > 0 ? (
          sortedItems.map((item) => (
            <MealItem actingUserId={actingUserId} item={item} key={item.id} />
          ))
        ) : (
          <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 text-center text-sm text-zinc-500">
            No meals assigned
          </div>
        )}
      </div>

      <Link
        className={addButtonClassName}
        href={addMealHref({ weekStart, day: day.date, actingUserId })}
      >
        + Add meal
      </Link>
    </section>
  );
}

function DayMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white px-1.5 py-1 text-center shadow-[inset_0_0_0_1px_rgba(228,228,231,0.9)]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function MealItem({
  actingUserId,
  item,
}: {
  actingUserId?: string;
  item: ChopItMealPlanItem;
}) {
  return (
    <form
      action={deletePlanItemAction}
      className="rounded-md border border-zinc-200 bg-white p-2"
    >
      <input name="actingUserId" type="hidden" value={actingUserId ?? ''} />
      <input name="id" type="hidden" value={item.id} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {mealSlotLabel(item.mealSlot)}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold">{item.recipeTitle}</p>
            {item.servings > 1 ? (
              <span className="inline-flex h-5 items-center rounded-full bg-zinc-950 px-2 text-[0.68rem] font-semibold leading-none text-white">
                X {item.servings}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {round(item.kcal)} kcal · {round(item.protein)}P · {round(item.fat)}
            F · {round(item.carbs)}C
          </p>
        </div>
        <button className="text-xs font-semibold text-red-700">Remove</button>
      </div>
    </form>
  );
}

function MealPickerModal({
  actingUserId,
  day,
  recipes,
  selectedSlotId,
  weekStart,
}: {
  actingUserId?: string;
  day: string;
  recipes: ChopItRecipe[];
  selectedSlotId: string;
  weekStart: string;
}) {
  const selectedSlot =
    mealSlots.find((slot) => slot.id === selectedSlotId) ?? mealSlots[2];
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {weekdayName(day)} · {formatShortDate(day)}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Add meal
            </h2>
          </div>
          <Link
            aria-label="Close"
            className={modalCloseClassName}
            href={planHref(weekStart, actingUserId)}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>

        <div className="grid gap-4 p-4">
          <div>
            <p className="text-sm font-semibold">Meal type</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {mealSlots.map((slot) => (
                <Link
                  className={
                    slot.id === selectedSlot.id
                      ? selectedSlotClassName
                      : unselectedSlotClassName
                  }
                  href={addMealHref({
                    weekStart,
                    day,
                    actingUserId,
                    slotId: slot.id,
                  })}
                  key={slot.id}
                >
                  {slot.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Recipes</p>
              <p className="text-xs text-zinc-500">Sorted by name</p>
            </div>
            <div className="mt-2 grid max-h-[44vh] gap-2 overflow-auto pr-1">
              {recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <form
                    action={createPlanItemAction}
                    className="grid gap-3 rounded-md border border-zinc-200 p-3 transition hover:border-zinc-950 sm:grid-cols-[1fr_6.5rem_auto] sm:items-center"
                    key={recipe.id}
                  >
                    <input
                      name="actingUserId"
                      type="hidden"
                      value={actingUserId ?? ''}
                    />
                    <input name="weekStart" type="hidden" value={weekStart} />
                    <input name="mealDate" type="hidden" value={day} />
                    <input
                      name="mealSlot"
                      type="hidden"
                      value={selectedSlot.id}
                    />
                    <input name="recipeId" type="hidden" value={recipe.id} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-950">
                        {recipe.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {round(recipe.perServingKcal)} kcal/serving ·{' '}
                        {round(recipe.perServingProtein)}P ·{' '}
                        {round(recipe.perServingFat)}F ·{' '}
                        {round(recipe.perServingCarbs)}C
                      </p>
                    </div>
                    <Field label="Servings">
                      <input
                        className={inputClassName}
                        defaultValue="1"
                        min="0.25"
                        name="servings"
                        step="0.25"
                        type="number"
                      />
                    </Field>
                    <button className={primaryButtonClassName}>Add</button>
                  </form>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                  No recipes available.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type ShoppingStep = 'days' | 'recipes' | 'pantry';

type ShoppingWizardDay = {
  date: string;
  items: ChopItMealPlanItem[];
};

type PantryPreviewItem = {
  ingredient: ChopItIngredient;
  quantity: number;
  sourceDetails: PantryPreviewSourceDetail[];
};

type PantryPreviewSourceDetail = {
  recipeTitle: string;
  mealDate: string;
  mealSlot: string;
  servings: number;
  quantity: number;
};

type ExcludedPlanItemServing = {
  planItemId: string;
  servings: number;
};

function ShoppingWizardModal({
  actingUserId,
  days,
  excludedPlanItemIds,
  excludedPlanItemServings,
  excludedRecipeIds,
  ingredients,
  recipes,
  selectedDayData,
  selectedDays,
  step,
  weekStart,
}: {
  actingUserId?: string;
  days: ShoppingWizardDay[];
  excludedRecipeIds: string[];
  excludedPlanItemIds: string[];
  excludedPlanItemServings: ExcludedPlanItemServing[];
  ingredients: ChopItIngredient[];
  recipes: ChopItRecipe[];
  selectedDayData: ShoppingWizardDay[];
  selectedDays: string[];
  step: ShoppingStep;
  weekStart: string;
}) {
  const selectedDaySet = new Set(selectedDays);
  const selectedItems = selectedDayData
    .filter((day) => selectedDaySet.has(day.date))
    .flatMap((day) => day.items.map((item) => ({ ...item, day: day.date })));
  const excludedSet = new Set(excludedPlanItemIds);
  const previewItems = buildPantryPreview({
    excludedPlanItemIds: excludedSet,
    excludedPlanItemServings: new Map(
      excludedPlanItemServings.map((item) => [item.planItemId, item.servings]),
    ),
    ingredients,
    items: selectedItems,
    recipes,
  });
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Shopping list
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {step === 'days'
                ? 'Select days'
                : step === 'recipes'
                  ? 'Exclude recipes'
                  : 'Adjust pantry'}
            </h2>
          </div>
          <Link
            aria-label="Close"
            className={modalCloseClassName}
            href={planHref(weekStart, actingUserId)}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>
        {step === 'days' ? (
          <ShoppingDaysStep
            actingUserId={actingUserId}
            days={days}
            selectedDays={selectedDays}
            weekStart={weekStart}
          />
        ) : step === 'recipes' ? (
          <ShoppingRecipesStep
            actingUserId={actingUserId}
            days={selectedDayData}
            excludedPlanItemIds={excludedPlanItemIds}
            excludedPlanItemServings={excludedPlanItemServings}
            excludedRecipeIds={excludedRecipeIds}
            selectedDays={selectedDays}
            selectedItems={selectedItems}
            weekStart={weekStart}
          />
        ) : (
          <ShoppingPantryStep
            actingUserId={actingUserId}
            excludedRecipeIds={excludedRecipeIds}
            excludedPlanItemIds={excludedPlanItemIds}
            excludedPlanItemServings={excludedPlanItemServings}
            previewItems={previewItems}
            selectedDays={selectedDays}
            weekStart={weekStart}
          />
        )}
      </section>
    </div>
  );
}

function ShoppingRecipesStep({
  actingUserId,
  days,
  excludedPlanItemIds,
  excludedPlanItemServings,
  excludedRecipeIds,
  selectedDays,
  selectedItems,
  weekStart,
}: {
  actingUserId?: string;
  days: ShoppingWizardDay[];
  excludedPlanItemIds: string[];
  excludedPlanItemServings: ExcludedPlanItemServing[];
  excludedRecipeIds: string[];
  selectedDays: string[];
  selectedItems: Array<ChopItMealPlanItem & { day: string }>;
  weekStart: string;
}) {
  const excludedSet = new Set(excludedPlanItemIds);
  const excludedServingsByItem = new Map(
    excludedPlanItemServings.map((item) => [item.planItemId, item.servings]),
  );
  return (
    <form action="/chop-it/plans" className="grid gap-4 p-4">
      <input name="shoppingStep" type="hidden" value="pantry" />
      <input name="weekStart" type="hidden" value={weekStart} />
      {actingUserId ? (
        <input name="actingUserId" type="hidden" value={actingUserId} />
      ) : null}
      {selectedDays.map((day) => (
        <input key={day} name="day" type="hidden" value={day} />
      ))}
      <div className="grid max-h-[54vh] gap-3 overflow-auto pr-1">
        {selectedItems.length > 0 ? (
          days
            .filter((day) => selectedDays.includes(day.date))
            .map((day) => (
              <section
                className="rounded-lg border border-zinc-200 p-3"
                key={day.date}
              >
                <h3 className="text-sm font-semibold">
                  {weekdayName(day.date)} · {formatShortDate(day.date)}
                </h3>
                <div className="mt-2 grid gap-2">
                  {day.items.map((item) => {
                    const excludedServings = clampServings(
                      excludedServingsByItem.get(item.id) ??
                        (excludedSet.has(item.id) ? item.servings : 0),
                      item.servings,
                    );
                    const includedServings = Math.max(
                      item.servings - excludedServings,
                      0,
                    );
                    return (
                      <div
                        className="grid gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm transition hover:border-zinc-950 sm:grid-cols-[1fr_auto] sm:items-center"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <span className="block truncate font-semibold">
                            {item.recipeTitle}
                          </span>
                          <span className="mt-1 block text-xs text-zinc-500">
                            {weekdayName(day.date)} {formatShortDate(day.date)}{' '}
                            · {mealSlotLabel(item.mealSlot)}
                            {item.servings > 1 ? ` · X ${item.servings}` : ''}
                          </span>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              excludedServings > 0
                                ? 'bg-zinc-950 text-white'
                                : 'bg-zinc-100 text-zinc-500'
                            }`}
                          >
                            {excludedServings > 0
                              ? `Exclude ${round(excludedServings)} of ${round(item.servings)} servings`
                              : `Include ${round(item.servings)} of ${round(item.servings)} servings`}
                          </span>
                        </div>
                        <RecipeExclusionControl
                          defaultExcludedServings={excludedServings}
                          itemId={item.id}
                          recipeTitle={item.recipeTitle}
                          servings={item.servings}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
        ) : (
          <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
            There are no meals on the selected days.
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-4">
        <Link
          className={secondaryButtonClassName}
          href={shoppingWizardHref({
            actingUserId,
            selectedDays,
            step: 'days',
            weekStart,
          })}
        >
          Back
        </Link>
        <button className={primaryButtonClassName}>Next</button>
      </div>
    </form>
  );
}

function ShoppingPantryStep({
  actingUserId,
  excludedPlanItemIds,
  excludedPlanItemServings,
  excludedRecipeIds,
  previewItems,
  selectedDays,
  weekStart,
}: {
  actingUserId?: string;
  excludedPlanItemIds: string[];
  excludedPlanItemServings: ExcludedPlanItemServing[];
  excludedRecipeIds: string[];
  previewItems: PantryPreviewItem[];
  selectedDays: string[];
  weekStart: string;
}) {
  const startDate = selectedDays[0] ?? weekStart;
  const endDate = selectedDays[selectedDays.length - 1] ?? weekStart;
  return (
    <form action={generateShoppingListAction} className="grid gap-4 p-4">
      <input name="actingUserId" type="hidden" value={actingUserId ?? ''} />
      <input name="startDate" type="hidden" value={startDate} />
      <input name="endDate" type="hidden" value={endDate} />
      <input
        name="title"
        type="hidden"
        value={`Shopping ${formatShortDate(startDate)} - ${formatShortDate(endDate)}`}
      />
      {excludedPlanItemIds.map((itemId) => (
        <input
          key={itemId}
          name="excludedPlanItemId"
          type="hidden"
          value={itemId}
        />
      ))}
      {excludedPlanItemServings.map((item) => (
        <div hidden key={item.planItemId}>
          <input
            name="excludedPlanItemId"
            type="hidden"
            value={item.planItemId}
          />
          <input
            name={`excludedPlanItemServings:${item.planItemId}`}
            type="hidden"
            value={item.servings}
          />
        </div>
      ))}
      {excludedRecipeIds.map((recipeId) => (
        <input
          key={recipeId}
          name="excludedRecipeId"
          type="hidden"
          value={recipeId}
        />
      ))}
      <div className="grid max-h-[54vh] gap-2 overflow-auto pr-1">
        {previewItems.length > 0 ? (
          previewItems.map((item) => (
            <div
              className="grid gap-3 rounded-md border border-zinc-200 p-2.5 sm:grid-cols-[1fr_auto] sm:p-3"
              key={item.ingredient.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.ingredient.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Required: {round(item.quantity)} {item.ingredient.unit}
                </p>
                <div className="mt-2 grid gap-1">
                  {item.sourceDetails.map((detail) => (
                    <div
                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md bg-zinc-50 px-2 py-1 text-[0.62rem] leading-tight text-zinc-500 sm:bg-transparent sm:px-0 sm:text-xs"
                      key={`${item.ingredient.id}:${detail.mealDate}:${detail.mealSlot}:${detail.recipeTitle}:${detail.quantity}`}
                    >
                      <span className="min-w-0">
                        <span className="block break-words font-semibold text-zinc-600">
                          {detail.recipeTitle}
                          {detail.servings > 1 ? ` · X ${detail.servings}` : ''}
                        </span>
                        <span className="mt-0.5 block break-words">
                          {weekdayName(detail.mealDate)}{' '}
                          {formatShortDate(detail.mealDate)} ·{' '}
                          {mealSlotLabel(detail.mealSlot)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-semibold tabular-nums text-zinc-700">
                        {round(detail.quantity)} {item.ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <PantryQuantityControl
                ingredientId={item.ingredient.id}
                maxQuantity={item.quantity}
                unit={item.ingredient.unit}
              />
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
            There are no ingredients to buy with this selection.
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-4">
        <Link
          className={secondaryButtonClassName}
          href={shoppingWizardHref({
            actingUserId,
            excludedPlanItemIds,
            excludedPlanItemServings,
            excludedRecipeIds,
            selectedDays,
            step: 'recipes',
            weekStart,
          })}
        >
          Back
        </Link>
        <button className={primaryButtonClassName}>Generate list</button>
      </div>
    </form>
  );
}

function WeekTotal({ plan }: { plan: ChopItMealPlanWeek }) {
  return (
    <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto sm:gap-2">
      <Metric label="Kcal" value={round(plan.weekTotals.kcal)} />
      <Metric label="Prot." value={round(plan.weekTotals.protein)} />
      <Metric label="Fat" value={round(plan.weekTotals.fat)} />
      <Metric label="Carbs" value={round(plan.weekTotals.carbs)} />
    </div>
  );
}

function WeekAverage({ plan }: { plan: ChopItMealPlanWeek }) {
  const totals = oneServingWeekTotals(plan);
  return (
    <div>
      <p className="mb-1 text-right text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Daily average
      </p>
      <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto sm:gap-2">
        <Metric label="Kcal" value={round(totals.kcal / 7)} />
        <Metric label="Prot." value={round(totals.protein / 7)} />
        <Metric label="Fat" value={round(totals.fat / 7)} />
        <Metric label="Carbs" value={round(totals.carbs / 7)} />
      </div>
    </div>
  );
}

function oneServingWeekTotals(plan: ChopItMealPlanWeek) {
  return plan.items.reduce(
    (totals, item) => {
      const servings = item.servings > 0 ? item.servings : 1;
      return {
        kcal: totals.kcal + item.kcal / servings,
        protein: totals.protein + item.protein / servings,
        fat: totals.fat + item.fat / servings,
        carbs: totals.carbs + item.carbs / servings,
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-200 px-2 py-2 text-center sm:min-w-14 sm:px-3">
      <p className="truncate text-[0.68rem] text-zinc-500 sm:text-xs">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const inputClassName =
  'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const primaryButtonClassName =
  'h-11 self-end rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const secondaryButtonClassName =
  'inline-flex h-11 items-center justify-center rounded-md border border-zinc-950 px-4 text-sm font-semibold transition hover:bg-zinc-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const weekArrowClassName =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';
const modalCloseClassName =
  'grid size-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';
const selectedSlotClassName =
  'rounded-md bg-zinc-950 px-3 py-3 text-center text-sm font-semibold text-white';
const unselectedSlotClassName =
  'rounded-md border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-600 transition hover:border-zinc-950 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';

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

function emptyWeek(ownerUserId: string, weekStart: string): ChopItMealPlanWeek {
  return {
    ownerUserId,
    weekStart,
    items: [],
    days: Array.from({ length: 7 }, (_, index) => {
      const date = dateFromOrdinal(dateOrdinal(weekStart) + index);
      return {
        date,
        totalKcal: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
      };
    }),
    weekTotals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  };
}

function currentWeekStart(): string {
  const today = new Date();
  const day = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

function weekdayName(date: string): string {
  const names = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return names[day] ?? date;
}

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatWeekRange(weekStart: string): string {
  const startOrdinal = dateOrdinal(weekStart);
  const end = dateFromOrdinal(startOrdinal + 6);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  });
  return `${formatter.format(new Date(`${weekStart}T00:00:00Z`))} - ${formatter.format(
    new Date(`${end}T00:00:00Z`),
  )}`;
}

function mealSlotLabel(slotId: string): string {
  return mealSlots.find((slot) => slot.id === slotId)?.label ?? slotId;
}

function mealSlotIndex(slotId: string): number {
  const index = mealSlots.findIndex((slot) => slot.id === slotId);
  return index === -1 ? mealSlots.length : index;
}

function dateOrdinal(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

function dateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

function nullableString(value: FormDataEntryValue | null): string | null {
  const parsed = String(value ?? '').trim();
  return parsed.length > 0 ? parsed : null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function shoppingStepFromParam(value?: string): ShoppingStep | null {
  if (value === 'days' || value === 'recipes' || value === 'pantry') {
    return value;
  }
  return null;
}

function getParamArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function stringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1);
  }
  return value;
}

function buildShoppingDays(
  weekStart: string,
  plan: ChopItMealPlanWeek,
): ShoppingWizardDay[] {
  const itemByDate = new Map<string, ChopItMealPlanItem[]>();
  for (const item of plan.items) {
    itemByDate.set(item.mealDate, [
      ...(itemByDate.get(item.mealDate) ?? []),
      item,
    ]);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = dateFromOrdinal(dateOrdinal(weekStart) + index);
    return {
      date,
      items: [...(itemByDate.get(date) ?? [])].sort(
        (left, right) =>
          mealSlotIndex(left.mealSlot) - mealSlotIndex(right.mealSlot),
      ),
    };
  });
}

function mergeShoppingDays(days: ShoppingWizardDay[]): ShoppingWizardDay[] {
  const dayByDate = new Map<string, ShoppingWizardDay>();
  for (const day of days) {
    const existing = dayByDate.get(day.date);
    dayByDate.set(day.date, {
      date: day.date,
      items: [...(existing?.items ?? []), ...day.items].sort(
        (left, right) =>
          mealSlotIndex(left.mealSlot) - mealSlotIndex(right.mealSlot),
      ),
    });
  }
  return [...dayByDate.values()].sort(
    (left, right) => dateOrdinal(left.date) - dateOrdinal(right.date),
  );
}

function buildPantryPreview({
  excludedPlanItemIds,
  excludedPlanItemServings,
  ingredients,
  items,
  recipes,
}: {
  excludedPlanItemIds: Set<string>;
  excludedPlanItemServings: Map<string, number>;
  ingredients: ChopItIngredient[];
  items: Array<ChopItMealPlanItem & { day: string }>;
  recipes: ChopItRecipe[];
}): PantryPreviewItem[] {
  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const quantityByIngredient = new Map<string, number>();
  const sourceDetailsByIngredient = new Map<
    string,
    PantryPreviewSourceDetail[]
  >();
  for (const item of items) {
    const recipe = recipeById.get(item.recipeId);
    if (!recipe) {
      continue;
    }
    const explicitExcludedServings = excludedPlanItemServings.get(item.id);
    const excludedServings =
      explicitExcludedServings === undefined
        ? excludedPlanItemIds.has(item.id)
          ? item.servings
          : 0
        : clampServings(explicitExcludedServings, item.servings);
    const includedServings = Math.max(item.servings - excludedServings, 0);
    if (includedServings === 0) {
      continue;
    }
    for (const recipeIngredient of recipe.ingredients) {
      const quantity =
        (recipeIngredient.quantity / recipe.servings) * includedServings;
      quantityByIngredient.set(
        recipeIngredient.ingredientId,
        (quantityByIngredient.get(recipeIngredient.ingredientId) ?? 0) +
          quantity,
      );
      const sourceDetails =
        sourceDetailsByIngredient.get(recipeIngredient.ingredientId) ?? [];
      sourceDetails.push({
        recipeTitle: recipe.title,
        mealDate: item.day,
        mealSlot: item.mealSlot,
        servings: includedServings,
        quantity,
      });
      sourceDetailsByIngredient.set(
        recipeIngredient.ingredientId,
        sourceDetails,
      );
    }
  }
  return [...quantityByIngredient.entries()]
    .flatMap(([ingredientId, quantity]) => {
      const ingredient = ingredientById.get(ingredientId);
      return ingredient
        ? [
            {
              ingredient,
              quantity,
              sourceDetails: sourceDetailsByIngredient.get(ingredientId) ?? [],
            },
          ]
        : [];
    })
    .sort((left, right) =>
      left.ingredient.name.localeCompare(right.ingredient.name),
    );
}

function pantryItemsFromForm(
  formData: FormData,
): Array<{ ingredientId: string; quantity: number }> {
  const pantryByIngredient = new Map<string, number>();
  const enabledIngredients = new Set<string>();
  const maxByIngredient = new Map<string, number>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('hasPantry:')) {
      enabledIngredients.add(key.replace('hasPantry:', ''));
    }
    if (key.startsWith('pantryMax:')) {
      maxByIngredient.set(key.replace('pantryMax:', ''), Number(value));
    }
    if (key.startsWith('pantryQuantity:')) {
      const ingredientId = key.replace('pantryQuantity:', '');
      if (!enabledIngredients.has(ingredientId)) {
        continue;
      }
      const quantity = Number(value);
      if (quantity > 0) {
        pantryByIngredient.set(
          ingredientId,
          Math.min(quantity, maxByIngredient.get(ingredientId) ?? quantity),
        );
      }
    }
  }
  return [...pantryByIngredient.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
}

function excludedPlanItemsFromForm(
  formData: FormData,
): Array<{ planItemId: string; servings: number }> {
  const excludedByPlanItem = new Map<string, number>();
  const checkedPlanItemIds = new Set(
    uniqueStrings(formData.getAll('excludedPlanItemId').map(String)),
  );
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('excludedPlanItemServings:')) {
      continue;
    }
    const planItemId = key.replace('excludedPlanItemServings:', '');
    if (!checkedPlanItemIds.has(planItemId)) {
      continue;
    }
    const servings = Number(value);
    if (planItemId && Number.isFinite(servings) && servings > 0) {
      excludedByPlanItem.set(planItemId, servings);
    }
  }
  for (const planItemId of checkedPlanItemIds) {
    if (!excludedByPlanItem.has(planItemId)) {
      excludedByPlanItem.set(planItemId, 1);
    }
  }
  return [...excludedByPlanItem.entries()].map(([planItemId, servings]) => ({
    planItemId,
    servings,
  }));
}

function excludedPlanItemServingsFromParams(
  searchParams: PlansSearchParams,
): ExcludedPlanItemServing[] {
  return Object.entries(searchParams)
    .filter(([key]) => key.startsWith('excludedPlanItemServings:'))
    .flatMap(([key, rawValue]) => {
      const planItemId = key.replace('excludedPlanItemServings:', '');
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      const servings = Number(value);
      return planItemId && Number.isFinite(servings) && servings > 0
        ? [{ planItemId, servings }]
        : [];
    });
}

function clampServings(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), max);
}

function planHref(weekStart: string, actingUserId?: string): string {
  const params = new URLSearchParams({ weekStart });
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  return `/chop-it/plans?${params.toString()}`;
}

function shoppingListsHref(actingUserId?: string): string {
  const params = new URLSearchParams();
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return `/chop-it/shopping-lists${suffix}`;
}

function shoppingWizardHref({
  actingUserId,
  excludedPlanItemIds = [],
  excludedPlanItemServings = [],
  excludedRecipeIds = [],
  selectedDays = [],
  step,
  weekStart,
}: {
  actingUserId?: string;
  excludedPlanItemIds?: string[];
  excludedPlanItemServings?: ExcludedPlanItemServing[];
  excludedRecipeIds?: string[];
  selectedDays?: string[];
  step: ShoppingStep;
  weekStart: string;
}): string {
  const params = new URLSearchParams({ shoppingStep: step, weekStart });
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  for (const day of selectedDays) {
    params.append('day', day);
  }
  for (const recipeId of excludedRecipeIds) {
    params.append('excludedRecipeId', recipeId);
  }
  for (const itemId of excludedPlanItemIds) {
    params.append('excludedPlanItemId', itemId);
  }
  for (const item of excludedPlanItemServings) {
    params.set(
      `excludedPlanItemServings:${item.planItemId}`,
      String(item.servings),
    );
  }
  return `/chop-it/plans?${params.toString()}`;
}

function isIsoDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function weekStartForDate(date: string): string {
  const utcDay = new Date(`${date}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  return dateFromOrdinal(dateOrdinal(date) - daysSinceMonday);
}

function addMealHref({
  actingUserId,
  day,
  slotId = 'lunch',
  weekStart,
}: {
  actingUserId?: string;
  day: string;
  slotId?: string;
  weekStart: string;
}): string {
  const params = new URLSearchParams({
    addDate: day,
    addSlot: slotId,
    weekStart,
  });
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  return `/chop-it/plans?${params.toString()}`;
}

function chopItHomeHref(actingUserId?: string): string {
  if (!actingUserId) {
    return '/chop-it';
  }
  return `/chop-it?actingUserId=${encodeURIComponent(actingUserId)}`;
}
