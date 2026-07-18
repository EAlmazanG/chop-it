import type { CSSProperties } from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ArchiveIcon, CloseIcon, SaveIcon } from '@/components/action-icons';
import { AppHeader } from '@/components/app-header';
import { ChopItSectionHeader } from '@/components/chop-it-section-header';
import { EditIcon } from '@/components/edit-icon';
import {
  createChopItCategory,
  createChopItIngredient,
  deleteChopItCategory,
  deleteChopItIngredient,
  fetchChopItCategories,
  fetchChopItIngredients,
  updateChopItCategory,
  updateChopItIngredient,
} from '@/features/chop-it/api';
import type {
  ChopItCategory,
  ChopItIngredient,
  ChopItIngredientInput,
} from '@/features/chop-it/types';

import { IngredientFilters } from './ingredient-filters';
import { IngredientMacroEntry } from './ingredient-macro-entry';
import { MacroCategorySelect } from './macro-category-select';

type SortDirection = 'asc' | 'desc';

async function createCategoryAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await createChopItCategory(String(formData.get('name') ?? '').trim());
  revalidatePath('/chop-it/ingredients');
  redirect(categoriesHref('', '', 'asc', actingUserId));
}

async function updateCategoryAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await updateChopItCategory(
    String(formData.get('categoryId') ?? formData.get('id') ?? ''),
    String(formData.get('name') ?? '').trim(),
  );
  revalidatePath('/chop-it/ingredients');
  redirect(categoriesHref('', '', 'asc', actingUserId));
}

async function deleteCategoryAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await deleteChopItCategory(
    String(formData.get('categoryId') ?? formData.get('id') ?? ''),
  );
  revalidatePath('/chop-it/ingredients');
  redirect(categoriesHref('', '', 'asc', actingUserId));
}

async function createIngredientAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await createChopItIngredient(inputFromForm(formData));
  revalidatePath('/chop-it/ingredients');
  redirect(ingredientsHref('', '', 'asc', actingUserId));
}

async function updateIngredientAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await updateChopItIngredient(
    String(formData.get('id') ?? ''),
    inputFromForm(formData),
  );
  revalidatePath('/chop-it/ingredients');
  redirect(ingredientsHref('', '', 'asc', actingUserId));
}

async function deleteIngredientAction(formData: FormData) {
  'use server';

  const actingUserId =
    nullableString(formData.get('actingUserId')) ?? undefined;
  await deleteChopItIngredient(String(formData.get('id') ?? ''));
  revalidatePath('/chop-it/ingredients');
  redirect(ingredientsHref('', '', 'asc', actingUserId));
}

async function getIngredients(): Promise<ChopItIngredient[]> {
  return fetchChopItIngredients();
}

async function getCategories(): Promise<ChopItCategory[]> {
  try {
    return await fetchChopItCategories();
  } catch {
    return [];
  }
}

export default async function ChopItIngredientsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams?: Promise<{
    categories?: string;
    create?: string;
    editCategoryId?: string;
    editIngredientId?: string;
    actingUserId?: string;
    dir?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const searchParams = (await searchParamsPromise) ?? {};
  const [categories, ingredients] = await Promise.all([
    getCategories(),
    getIngredients(),
  ]);
  const query = searchParams.q ?? '';
  const sort = searchParams.sort ?? '';
  const sortDir = sortDirectionFromParam(searchParams.dir);
  const actingUserId = searchParams.actingUserId;
  const visibleIngredients = filterAndSortIngredients(
    ingredients,
    categories,
    query,
    sort,
    sortDir,
  );
  const editingIngredient =
    ingredients.find(
      (ingredient) => ingredient.id === searchParams.editIngredientId,
    ) ?? null;

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
                {ingredients.length}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                ingredients
              </p>
            </div>
          }
          description="Shared catalog for recipes, meal plans, and shopping lists."
          icon="ingredients"
          title="Ingredients"
        />

        <div className="mb-3 flex justify-end">
          <Link
            className={secondaryButtonClassName}
            href={categoriesHref(query, sort, sortDir, actingUserId)}
          >
            Edit tags
          </Link>
        </div>
        <IngredientFilters actingUserId={actingUserId} query={query} />

        <div className="mt-6">
          {visibleIngredients.length > 0 ? (
            <IngredientList
              categories={categories}
              ingredients={visibleIngredients}
              actingUserId={actingUserId}
              query={query}
              sort={sort}
              sortDir={sortDir}
            />
          ) : (
            <EmptyState />
          )}
        </div>
        <Link
          aria-label="Add ingredient"
          className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-zinc-950 text-3xl font-semibold leading-none text-white shadow-lg transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          href={ingredientCreateHref(query, sort, sortDir, actingUserId)}
        >
          +
        </Link>
        {searchParams.categories === '1' ? (
          <CategoryModal
            categories={categories}
            actingUserId={actingUserId}
            closeHref={ingredientsHref(query, sort, sortDir, actingUserId)}
            editCategoryId={searchParams.editCategoryId}
            ingredients={ingredients}
            query={query}
            sort={sort}
            sortDir={sortDir}
          />
        ) : null}
        {searchParams.create === '1' ? (
          <IngredientEditorModal
            action={createIngredientAction}
            actingUserId={actingUserId}
            categories={categories}
            closeHref={ingredientsHref(query, sort, sortDir, actingUserId)}
            mode="create"
          />
        ) : null}
        {editingIngredient ? (
          <IngredientEditorModal
            action={updateIngredientAction}
            actingUserId={actingUserId}
            categories={categories}
            closeHref={ingredientsHref(query, sort, sortDir, actingUserId)}
            deleteAction={deleteIngredientAction}
            ingredient={editingIngredient}
            mode="edit"
          />
        ) : null}
      </section>
    </main>
  );
}

function CategoryModal({
  actingUserId,
  categories,
  closeHref,
  editCategoryId,
  ingredients,
  query,
  sort,
  sortDir,
}: {
  actingUserId?: string;
  categories: ChopItCategory[];
  closeHref: string;
  editCategoryId?: string;
  ingredients: ChopItIngredient[];
  query: string;
  sort: string;
  sortDir: SortDirection;
}) {
  const categoryUsage = new Map<string, number>();
  for (const ingredient of ingredients) {
    categoryUsage.set(
      ingredient.secondaryCategoryId,
      (categoryUsage.get(ingredient.secondaryCategoryId) ?? 0) + 1,
    );
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Ingredients
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Tags
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Manage the catalog&apos;s shared secondary tags.
            </p>
          </div>
          <Link
            aria-label="Close"
            className={modalCloseClassName}
            href={closeHref}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>

        <div className="grid gap-3 p-4">
          <form
            action={createCategoryAction}
            className="grid gap-2 sm:grid-cols-[auto_1fr_auto]"
          >
            {actingUserId ? (
              <input name="actingUserId" type="hidden" value={actingUserId} />
            ) : null}
            <div className="grid h-11 w-11 place-items-center rounded-full bg-zinc-950 text-xl font-semibold text-white">
              +
            </div>
            <input
              className={inputClassName}
              name="name"
              placeholder="New tag"
              required
            />
            <button className={primaryButtonClassName}>Add</button>
          </form>

          <div className="grid gap-2">
            {categories.map((category) => {
              const isEditing = editCategoryId === category.id;
              const usageCount = categoryUsage.get(category.id) ?? 0;
              if (isEditing) {
                return (
                  <form
                    className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
                    key={category.id}
                  >
                    {actingUserId ? (
                      <input
                        name="actingUserId"
                        type="hidden"
                        value={actingUserId}
                      />
                    ) : null}
                    <input
                      name="categoryId"
                      type="hidden"
                      value={category.id}
                    />
                    <input
                      className={inputClassName}
                      defaultValue={category.name}
                      name="name"
                      required
                    />
                    <button
                      aria-label={`Save tag ${category.name}`}
                      className={saveIconButtonClassName}
                      formAction={updateCategoryAction}
                      title="Save"
                    >
                      <SaveIcon className="size-5" />
                    </button>
                    {usageCount > 0 ? (
                      <span className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-100 px-3 text-xs font-semibold text-zinc-500">
                        In use: {usageCount}
                      </span>
                    ) : (
                      <button
                        aria-label={`Delete tag ${category.name}`}
                        className={archiveIconButtonClassName}
                        formAction={deleteCategoryAction}
                        title="Delete"
                      >
                        <ArchiveIcon className="size-5" />
                      </button>
                    )}
                  </form>
                );
              }
              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-3"
                  key={category.id}
                >
                  <p className="text-sm font-semibold">{category.name}</p>
                  {usageCount > 0 ? (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                      {usageCount} ingredients
                    </span>
                  ) : null}
                  <Link
                    aria-label={`Edit tag ${category.name}`}
                    className={editIconButtonClassName}
                    href={categoryEditHref(
                      category.id,
                      query,
                      sort,
                      sortDir,
                      actingUserId,
                    )}
                  >
                    <EditIcon />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function IngredientEditorModal({
  action,
  actingUserId,
  categories,
  closeHref,
  deleteAction,
  ingredient,
  mode,
}: {
  action: (formData: FormData) => void | Promise<void>;
  actingUserId?: string;
  categories: ChopItCategory[];
  closeHref: string;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  ingredient?: ChopItIngredient;
  mode: 'create' | 'edit';
}) {
  const title =
    mode === 'create'
      ? 'Add ingredient'
      : `Edit ${ingredient?.name ?? ''}`;
  const selectedMacroTag = ingredient?.primaryMacroTag ?? 'protein';
  const selectedCategoryId =
    ingredient?.secondaryCategoryId ?? categories[0]?.id;
  const isOilIngredient = ingredient?.isOil ?? false;
  const selectedCategoryIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === selectedCategoryId),
  );
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Ingredient
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {title}
            </h2>
          </div>
          <Link
            aria-label="Close"
            className={modalCloseClassName}
            href={closeHref}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>

        <form action={action} className="grid gap-4 p-4">
          {actingUserId ? (
            <input name="actingUserId" type="hidden" value={actingUserId} />
          ) : null}
          {ingredient ? (
            <input name="id" type="hidden" value={ingredient.id} />
          ) : null}
          <Field label="Name">
            <input
              className={inputClassName}
              defaultValue={ingredient?.name ?? ''}
              name="name"
              placeholder="Chicken"
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category">
              <MacroCategorySelect
                className={inputClassName}
                defaultValue={selectedMacroTag}
                name="primaryMacroTag"
                required
              />
            </Field>
            <Field label="Tag">
              <select
                className={inputClassName}
                defaultValue={selectedCategoryId}
                name="secondaryCategoryId"
                required
                style={categorySelectStyle(selectedCategoryIndex)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <select
                className={inputClassName}
                defaultValue={ingredient?.unit ?? 'g'}
                name="unit"
                required
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
            </Field>
          </div>
          <IngredientMacroEntry
            defaults={{
              carbsPer100: ingredient?.carbsPer100,
              fatPer100: ingredient?.fatPer100,
              kcalPer100: ingredient?.kcalPer100,
              proteinPer100: ingredient?.proteinPer100,
            }}
            inputClassName={inputClassName}
          />
          {isOilIngredient ? (
            <section className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div>
                <p className="font-semibold">Reference oil</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Recipes using oil spray take their macros from this
                  ingredient. The value below converts each spray to grams
                  before calculating calories and fat.
                </p>
              </div>
              <Field label="Grams per spray">
                <input
                  className="h-11 w-full rounded-md border border-amber-200 bg-white px-3 text-sm outline-none transition placeholder:text-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                  defaultValue={ingredient?.gramsPerSpray ?? 1}
                  min="0.01"
                  name="gramsPerSpray"
                  required
                  step="0.01"
                  type="number"
                />
              </Field>
            </section>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <button
              aria-label={mode === 'create' ? 'Add ingredient' : 'Save'}
              className={saveIconButtonClassName}
              title={mode === 'create' ? 'Add ingredient' : 'Save'}
            >
              <SaveIcon className="size-5" />
            </button>
            {ingredient && deleteAction && !ingredient.isOil ? (
              <button
                aria-label="Archive"
                className={archiveIconButtonClassName}
                formAction={deleteAction}
                title="Archive"
                type="submit"
              >
                <ArchiveIcon className="size-5" />
              </button>
            ) : null}
            {ingredient?.isOil ? (
              <p className="self-center text-xs font-medium text-amber-800">
                This ingredient cannot be archived because it is the oil reference.
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function IngredientList({
  actingUserId,
  categories,
  ingredients,
  query,
  sort,
  sortDir,
}: {
  actingUserId?: string;
  categories: ChopItCategory[];
  ingredients: ChopItIngredient[];
  query: string;
  sort: string;
  sortDir: SortDirection;
}) {
  const categoryById = new Map(
    categories.map((category, index) => [category.id, { ...category, index }]),
  );
  const headers = [
    { field: 'name', label: 'Name', mobileLabel: 'Name', align: 'left' },
    {
      field: 'primaryMacroTag',
      label: 'Category',
      mobileLabel: 'Cat.',
      align: 'center',
    },
    {
      field: 'secondaryCategory',
      label: 'Tag',
      mobileLabel: 'Tag',
      align: 'center',
    },
    {
      field: 'kcalPer100',
      label: 'Kcal',
      mobileLabel: 'Kcal',
      align: 'right',
    },
    {
      field: 'proteinPer100',
      label: 'Prot.',
      mobileLabel: 'P',
      align: 'right',
    },
    {
      field: 'fatPer100',
      label: 'Fat',
      mobileLabel: 'G',
      align: 'right',
    },
    {
      field: 'carbsPer100',
      label: 'Carbs',
      mobileLabel: 'H',
      align: 'right',
    },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 sm:p-0">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%] sm:w-[32%]" />
          <col className="w-[7%] sm:w-[10%]" />
          <col className="w-[18%] sm:w-[12%]" />
          <col className="w-[10%] sm:w-[10%]" />
          <col className="w-[8%] sm:w-[8%]" />
          <col className="w-[8%] sm:w-[8%]" />
          <col className="w-[8%] sm:w-[8%]" />
          <col className="w-[15%] sm:w-[14%]" />
        </colgroup>
        <thead className="border-b border-zinc-100 bg-zinc-50/70 text-[0.46rem] font-medium uppercase tracking-[0.03em] text-zinc-500 sm:text-xs sm:tracking-[0.12em]">
          <tr className="align-middle">
            {headers.map((header) => (
              <th
                className={`${tableCellAlign(header.align)} px-1 py-2 first:pl-2 sm:px-2 sm:first:pl-2`}
                key={header.field}
              >
                <SortHeader
                  align={header.align}
                  field={header.field}
                  label={header.label}
                  mobileLabel={header.mobileLabel}
                  query={query}
                  sort={sort}
                  sortDir={sortDir}
                  actingUserId={actingUserId}
                />
              </th>
            ))}
            <th className="px-0.5 py-2 pr-1 sm:px-2" />
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ingredient) => {
            const category = categoryById.get(ingredient.secondaryCategoryId);
            return (
              <tr
                className={`border-b border-zinc-100 last:border-b-0 ${
                  ingredient.isOil ? 'bg-amber-50/55' : ''
                }`}
                key={ingredient.id}
              >
                <td className="px-1 py-2 pl-2 sm:px-3 sm:py-3 lg:px-5">
                  <h2 className="overflow-hidden break-words text-[0.63rem] font-normal leading-4 text-zinc-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:text-base sm:leading-6">
                    {ingredient.name}
                  </h2>
                  {ingredient.isOil ? (
                    <span className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-amber-800 sm:px-2 sm:text-[0.62rem]">
                      Oil
                    </span>
                  ) : null}
                </td>
                <td className="px-1 py-2 text-center sm:px-2 sm:py-3">
                  <TagPill
                    label={macroTagLabel(ingredient.primaryMacroTag)}
                    tone={ingredient.primaryMacroTag}
                  />
                </td>
                <td className="px-1 py-2 text-center sm:px-2 sm:py-3">
                  <CategoryPill
                    index={category?.index ?? 0}
                    label={category?.name ?? 'No tag'}
                  />
                </td>
                <td className="px-1 py-2 text-right sm:px-2 sm:py-3">
                  <InlineMetric
                    label="Kcal"
                    value={`${round(ingredient.kcalPer100)}`}
                  />
                </td>
                <td className="px-1 py-2 text-right sm:px-2 sm:py-3">
                  <InlineMetric
                    label="Prot."
                    value={`${round(ingredient.proteinPer100)} g`}
                  />
                </td>
                <td className="px-1 py-2 text-right sm:px-2 sm:py-3">
                  <InlineMetric
                    label="Fat"
                    value={`${round(ingredient.fatPer100)} g`}
                  />
                </td>
                <td className="px-1 py-2 text-right sm:px-2 sm:py-3">
                  <InlineMetric
                    label="Carbs"
                    value={`${round(ingredient.carbsPer100)} g`}
                  />
                </td>
                <td className="px-0.5 py-2 pr-1 text-right sm:px-2 sm:py-3 lg:px-4">
                  <Link
                    aria-label={`Edit ${ingredient.name}`}
                    className={editIconButtonClassName}
                    href={ingredientEditHref(
                      ingredient.id,
                      query,
                      sort,
                      sortDir,
                      actingUserId,
                    )}
                  >
                    <EditIcon />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  actingUserId,
  align,
  field,
  label,
  mobileLabel,
  query,
  sort,
  sortDir,
}: {
  actingUserId?: string;
  align: string;
  field: string;
  label: string;
  mobileLabel: string;
  query: string;
  sort: string;
  sortDir: SortDirection;
}) {
  const isActive = sort === field;
  const indicator = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '';
  return (
    <Link
      aria-label={sortHeaderLabel(label, isActive, sortDir)}
      className={`group inline-flex min-w-0 items-center gap-0.5 rounded py-1 transition hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 sm:gap-1.5 ${
        align === 'right'
          ? 'justify-end'
          : align === 'center'
            ? 'justify-center'
            : 'justify-start'
      } ${isActive ? 'text-zinc-950' : ''}`}
      href={sortHeaderHref(query, sort, sortDir, field, actingUserId)}
      title={sortHeaderLabel(label, isActive, sortDir)}
    >
      <span className="whitespace-nowrap leading-none lg:hidden">
        {mobileLabel}
      </span>
      <span className="hidden whitespace-nowrap lg:inline">{label}</span>
      <span className="inline-flex w-2 justify-center text-[0.52rem] leading-none text-zinc-950 sm:w-3 sm:text-[0.7rem]">
        {indicator}
      </span>
    </Link>
  );
}

function TagPill({
  label,
  tone,
}: {
  label: string;
  tone: ChopItIngredient['primaryMacroTag'];
}) {
  const className =
    tone === 'protein'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'fat'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-sky-200 bg-sky-50 text-sky-700';
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-center text-[0.48rem] font-medium uppercase leading-none sm:h-7 sm:w-full sm:truncate sm:px-2 sm:text-xs sm:normal-case ${className}`}
      title={label}
    >
      <span className="sm:hidden">{macroTagInitial(tone)}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function CategoryPill({ index, label }: { index: number; label: string }) {
  const palette = categoryPalette[index % categoryPalette.length];
  return (
    <span
      className="inline-flex h-5 min-w-12 max-w-full items-center justify-center truncate rounded-full border px-2 text-center text-[0.5rem] font-medium sm:h-7 sm:min-w-20 sm:px-3 sm:text-xs"
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

function tableCellAlign(align: string) {
  if (align === 'right') {
    return 'text-right';
  }
  if (align === 'center') {
    return 'text-center';
  }
  return 'text-left';
}

function InlineMetric({
  className = '',
  mobileValue,
  value,
}: {
  className?: string;
  label: string;
  mobileValue?: string;
  value: string;
}) {
  return (
    <div className={`min-w-0 text-right ${className}`}>
      <p className="truncate text-[0.62rem] font-normal tabular-nums text-zinc-950 sm:text-sm">
        <span className="sm:hidden">
          {mobileValue ?? value.replace(' g', '')}
        </span>
        <span className="hidden sm:inline">{value}</span>
      </p>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 px-2 py-1.5 text-center">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-5 py-12 text-center">
      <p className="text-sm font-semibold">No ingredients</p>
      <p className="mt-2 text-sm text-zinc-500">
        The shared catalog will appear here once ingredients are created.
      </p>
    </div>
  );
}

const inputClassName =
  'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const primaryButtonClassName =
  'h-11 self-end rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const secondaryButtonClassName =
  'inline-flex h-11 items-center justify-center rounded-md border border-zinc-950 px-4 text-sm font-semibold transition hover:bg-zinc-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const editIconButtonClassName =
  'inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 sm:h-9 sm:w-9 lg:justify-self-end';
const dangerButtonClassName =
  'h-11 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30';
const modalCloseClassName =
  'grid size-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';
const saveIconButtonClassName =
  'grid size-11 place-items-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const archiveIconButtonClassName =
  'grid size-11 place-items-center rounded-full border border-red-100 bg-red-50 text-red-700 transition hover:border-red-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30';

function categorySelectStyle(index: number): CSSProperties {
  const palette = categoryPalette[index % categoryPalette.length];
  return {
    backgroundColor: palette.background,
    borderColor: palette.border,
    color: palette.text,
  };
}

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

function inputFromForm(formData: FormData): ChopItIngredientInput {
  return {
    name: String(formData.get('name') ?? '').trim(),
    primaryMacroTag: String(
      formData.get('primaryMacroTag') ?? 'protein',
    ) as ChopItIngredientInput['primaryMacroTag'],
    secondaryCategoryId: String(formData.get('secondaryCategoryId') ?? ''),
    unit: String(formData.get('unit') ?? 'g') as ChopItIngredientInput['unit'],
    kcalPer100: decimalFromForm(formData.get('kcalPer100')),
    proteinPer100: decimalFromForm(formData.get('proteinPer100')),
    fatPer100: decimalFromForm(formData.get('fatPer100')),
    carbsPer100: decimalFromForm(formData.get('carbsPer100')),
    gramsPerSpray: nullableDecimalFromForm(formData.get('gramsPerSpray')),
  };
}

function decimalFromForm(value: FormDataEntryValue | null): number {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nullableDecimalFromForm(
  value: FormDataEntryValue | null,
): number | null {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function filterAndSortIngredients(
  ingredients: ChopItIngredient[],
  categories: ChopItCategory[],
  query: string,
  sort: string,
  sortDir: SortDirection,
): ChopItIngredient[] {
  const categoryById = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const normalizedQuery = normalizeSearchText(query);
  const direction = sortDir === 'desc' ? -1 : 1;
  const filteredIngredients = ingredients.filter((ingredient) => {
    if (!normalizedQuery) {
      return true;
    }
    const searchText = [
      ingredient.name,
      ingredient.primaryMacroTag,
      categoryById.get(ingredient.secondaryCategoryId) ?? '',
    ].join(' ');
    return normalizeSearchText(searchText).includes(normalizedQuery);
  });
  if (!sort) {
    return filteredIngredients;
  }
  return [...filteredIngredients].sort((left, right) => {
    let result: number;
    if (sort === 'secondaryCategory') {
      result = compareText(
        categoryById.get(left.secondaryCategoryId) ?? '',
        categoryById.get(right.secondaryCategoryId) ?? '',
      );
      return result * direction;
    }
    if (
      sort in left &&
      typeof left[sort as keyof ChopItIngredient] === 'number'
    ) {
      result =
        Number(left[sort as keyof ChopItIngredient]) -
        Number(right[sort as keyof ChopItIngredient]);
      return result * direction;
    }
    result = compareText(
      String(left[sort as keyof ChopItIngredient] ?? left.name),
      String(right[sort as keyof ChopItIngredient] ?? right.name),
    );
    return result * direction;
  });
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'es');
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function macroTagLabel(value: ChopItIngredient['primaryMacroTag']): string {
  if (value === 'protein') {
    return 'Protein';
  }
  if (value === 'fat') {
    return 'Fat';
  }
  return 'Carbs';
}

function macroTagInitial(value: ChopItIngredient['primaryMacroTag']): string {
  if (value === 'protein') {
    return 'P';
  }
  if (value === 'fat') {
    return 'G';
  }
  return 'H';
}

function sortDirectionFromParam(value: string | undefined): SortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

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

function ingredientsHref(
  query: string,
  sort: string,
  sortDir: SortDirection,
  actingUserId?: string,
): string {
  const params = new URLSearchParams();
  setIngredientSortParams(params, query, sort, sortDir);
  setActingUserParam(params, actingUserId);
  const suffix = params.toString();
  return suffix ? `/chop-it/ingredients?${suffix}` : '/chop-it/ingredients';
}

function categoriesHref(
  query: string,
  sort: string,
  sortDir: SortDirection,
  actingUserId?: string,
): string {
  const params = new URLSearchParams();
  setIngredientSortParams(params, query, sort, sortDir);
  params.set('categories', '1');
  setActingUserParam(params, actingUserId);
  return `/chop-it/ingredients?${params.toString()}`;
}

function categoryEditHref(
  categoryId: string,
  query: string,
  sort: string,
  sortDir: SortDirection,
  actingUserId?: string,
): string {
  const params = new URLSearchParams();
  setIngredientSortParams(params, query, sort, sortDir);
  params.set('categories', '1');
  params.set('editCategoryId', categoryId);
  setActingUserParam(params, actingUserId);
  return `/chop-it/ingredients?${params.toString()}`;
}

function ingredientCreateHref(
  query: string,
  sort: string,
  sortDir: SortDirection,
  actingUserId?: string,
): string {
  const params = new URLSearchParams();
  setIngredientSortParams(params, query, sort, sortDir);
  params.set('create', '1');
  setActingUserParam(params, actingUserId);
  return `/chop-it/ingredients?${params.toString()}`;
}

function ingredientEditHref(
  ingredientId: string,
  query: string,
  sort: string,
  sortDir: SortDirection,
  actingUserId?: string,
): string {
  const params = new URLSearchParams();
  setIngredientSortParams(params, query, sort, sortDir);
  params.set('editIngredientId', ingredientId);
  setActingUserParam(params, actingUserId);
  return `/chop-it/ingredients?${params.toString()}`;
}

function setIngredientSortParams(
  params: URLSearchParams,
  query: string,
  sort: string,
  sortDir: SortDirection,
) {
  if (query.trim()) {
    params.set('q', query);
  }
  if (sort) {
    params.set('sort', sort);
    if (sortDir === 'desc') {
      params.set('dir', sortDir);
    }
  }
}

function sortHeaderHref(
  query: string,
  currentSort: string,
  currentDir: SortDirection,
  field: string,
  actingUserId?: string,
): string {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query);
  }
  if (currentSort !== field) {
    params.set('sort', field);
  } else if (currentDir === 'asc') {
    params.set('sort', field);
    params.set('dir', 'desc');
  }
  setActingUserParam(params, actingUserId);
  const suffix = params.toString();
  return suffix ? `/chop-it/ingredients?${suffix}` : '/chop-it/ingredients';
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

function nullableString(value: FormDataEntryValue | null): string | null {
  const parsed = String(value ?? '').trim();
  return parsed.length > 0 ? parsed : null;
}

function sortHeaderLabel(
  label: string,
  isActive: boolean,
  sortDir: SortDirection,
): string {
  if (!isActive) {
    return `Sort by ${label} ascending`;
  }
  if (sortDir === 'asc') {
    return `Sort by ${label} descending`;
  }
  return `Clear ${label} sorting`;
}
