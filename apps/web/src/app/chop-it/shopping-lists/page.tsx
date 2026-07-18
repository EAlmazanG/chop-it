import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/app-header';
import { CheckIcon, TrashIcon } from '@/components/action-icons';
import { ChopItIcon } from '@/components/chop-it-icon';
import {
  completeChopItShoppingList,
  deleteChopItShoppingList,
  fetchChopItArchivedShoppingLists,
  fetchChopItCategories,
  fetchChopItCurrentShoppingList,
  fetchChopItIngredients,
  updateChopItShoppingListItem,
} from '@/features/chop-it/api';
import type {
  ChopItCategory,
  ChopItIngredient,
  ChopItShoppingList,
  ChopItShoppingListItem,
} from '@/features/chop-it/types';

import { ShoppingListExportActions } from './shopping-list-export-actions';

type ShoppingListsPageProps = {
  searchParams?: Promise<{
    dir?: string;
    listId?: string;
    sort?: string;
  }>;
};

type SortDirection = 'asc' | 'desc';
type ShoppingSort = 'name' | 'category' | 'tag' | '';

type EnrichedShoppingItem = ChopItShoppingListItem & {
  categoryName: string;
  nutrition: {
    carbs: number;
    fat: number;
    kcal: number;
    protein: number;
  };
  macroLabel: string;
};

const sections: Array<{
  id: ChopItShoppingListItem['section'];
  label: string;
  defaultOpen: boolean;
}> = [
  { id: 'recipe_excluded', label: 'Recetas quitadas', defaultOpen: true },
  { id: 'pantry', label: 'En despensa', defaultOpen: true },
  { id: 'missing', label: 'Por comprar', defaultOpen: true },
  { id: 'bought', label: 'Comprados', defaultOpen: false },
];

async function completeShoppingListAction(formData: FormData) {
  'use server';

  const listId = String(formData.get('id') ?? '');
  await completeChopItShoppingList(listId);
  revalidatePath('/chop-it/shopping-lists');
  redirect(shoppingListsHref({ listId }));
}

async function deleteShoppingListAction(formData: FormData) {
  'use server';

  await deleteChopItShoppingList(String(formData.get('id') ?? ''));
  revalidatePath('/chop-it/shopping-lists');
  redirect(shoppingListsHref({}));
}

async function updateShoppingListItemAction(formData: FormData) {
  'use server';

  await updateChopItShoppingListItem(String(formData.get('id') ?? ''), {
    isChecked: String(formData.get('isChecked') ?? '') === 'true',
  });
  revalidatePath('/chop-it/shopping-lists');
}

async function getCurrentShoppingList(): Promise<ChopItShoppingList | null> {
  return fetchChopItCurrentShoppingList();
}

async function getArchivedShoppingLists(): Promise<ChopItShoppingList[]> {
  try {
    return await fetchChopItArchivedShoppingLists();
  } catch {
    return [];
  }
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

export default async function ChopItShoppingListsPage({
  searchParams: searchParamsPromise,
}: ShoppingListsPageProps) {
  const searchParams = (await searchParamsPromise) ?? {};
  const actingUserId = undefined;
  const selectedListId = searchParams.listId;
  const sort = shoppingSortFromParam(searchParams.sort);
  const sortDir = sortDirectionFromParam(searchParams.dir);

  const [currentList, archivedLists, ingredients, categories] =
    await Promise.all([
      getCurrentShoppingList(),
      getArchivedShoppingLists(),
      getIngredients(),
      getCategories(),
    ]);
  const missingCount =
    currentList?.items.filter((item) => item.section === 'missing').length ?? 0;
  const boughtCount =
    currentList?.items.filter((item) => item.section === 'bought').length ?? 0;
  const selectedList =
    archivedLists.find((shoppingList) => shoppingList.id === selectedListId) ??
    (currentList?.id === selectedListId ? currentList : null);
  const detailList = selectedList ?? currentList;
  const detailTitle = selectedList
    ? selectedList.status === 'current'
      ? 'Lista actual'
      : 'Lista anterior'
    : currentList
      ? 'Lista actual'
      : null;

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <AppHeader
        section="Chop It!"
        sectionHref={chopItHomeHref(actingUserId)}
      />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-5">
              <ChopItIcon
                className="size-24 shrink-0 rounded-[1.75rem] object-cover sm:size-28"
                icon="shoppingList"
                priority
              />
              <h1 className="text-3xl font-semibold tracking-tight">
                Lista de la compra
              </h1>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Revisa la compra activa, lo que ya tienes y las listas archivadas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="faltantes" value={missingCount} />
            <MetricCard label="comprados" value={boughtCount} />
          </div>
        </div>

        <div className="mt-6">
          {detailList ? (
            <ShoppingListDetail
              actingUserId={actingUserId}
              categories={categories}
              ingredients={ingredients}
              shoppingList={detailList}
              sort={sort}
              sortDir={sortDir}
              title={detailTitle ?? 'Lista'}
            />
          ) : (
            <EmptyState actingUserId={actingUserId} />
          )}
        </div>

        <ArchivedLists
          actingUserId={actingUserId}
          selectedListId={detailList?.id}
          shoppingLists={archivedLists}
        />
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 px-4 py-3 text-right">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function ShoppingListStatusBadge({
  shoppingList,
}: {
  shoppingList: ChopItShoppingList;
}) {
  if (shoppingList.status === 'current') {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activa
      </span>
    );
  }
  if (shoppingList.completedAt) {
    return (
      <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">
        Completada
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Sin completar
    </span>
  );
}

function shoppingListExportText(shoppingList: ChopItShoppingList): string {
  const lines = [
    shoppingList.title,
    `${shoppingList.startDate} a ${shoppingList.endDate}`,
    '',
  ];
  for (const section of sections) {
    const items = shoppingList.items.filter(
      (item) => item.section === section.id,
    );
    if (items.length === 0) {
      continue;
    }
    lines.push(`## ${section.label}`);
    for (const item of items) {
      const quantity = round(item.finalQuantity || item.requiredQuantity);
      const sourceText = item.sourceDetails
        .map((detail) => detail.recipeTitle)
        .join(', ');
      lines.push(
        `${item.ingredientName} - ${quantity} ${item.unit}${sourceText ? ` (${sourceText})` : ''}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

function ShoppingListDetail({
  actingUserId,
  categories,
  ingredients,
  shoppingList,
  sort,
  sortDir,
  title,
}: {
  actingUserId?: string;
  categories: ChopItCategory[];
  ingredients: ChopItIngredient[];
  shoppingList: ChopItShoppingList;
  sort: ShoppingSort;
  sortDir: SortDirection;
  title: string;
}) {
  const enrichedItems = enrichShoppingItems(
    shoppingList.items,
    ingredients,
    categories,
  );
  const isCompleted = Boolean(shoppingList.completedAt);
  const exportText = shoppingListExportText(shoppingList);
  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {title}
            </p>
            <ShoppingListStatusBadge shoppingList={shoppingList} />
          </div>
          <h2 className="mt-2 text-xl font-semibold">{shoppingList.title}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {shoppingList.startDate} a {shoppingList.endDate}
          </p>
          {isCompleted ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Cerrada el {shoppingList.completedAt?.slice(0, 10)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <ShoppingListExportActions
            text={exportText}
            title={shoppingList.title}
          />
          {!isCompleted ? (
            <form action={completeShoppingListAction}>
              <input
                name="actingUserId"
                type="hidden"
                value={actingUserId ?? ''}
              />
              <input name="id" type="hidden" value={shoppingList.id} />
              <button
                aria-label="Completar"
                className="grid size-10 place-items-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                title="Marcar lista como completa"
              >
                <CheckIcon className="size-4" />
              </button>
            </form>
          ) : null}
          <form action={deleteShoppingListAction}>
            <input
              name="actingUserId"
              type="hidden"
              value={actingUserId ?? ''}
            />
            <input name="id" type="hidden" value={shoppingList.id} />
            <button
              aria-label="Borrar"
              className="grid size-10 place-items-center rounded-full border border-red-200 text-red-700 transition hover:border-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              title="Eliminar lista"
            >
              <TrashIcon className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <SortControls
        actingUserId={actingUserId}
        listId={shoppingList.id}
        sort={sort}
        sortDir={sortDir}
      />

      <div className="mt-4 grid gap-3">
        {sections.map((section) => {
          const sectionItems = shoppingSectionItems(enrichedItems, section.id);
          return (
            <ShoppingSection
              actingUserId={actingUserId}
              defaultOpen={section.defaultOpen}
              items={sortShoppingItems(sectionItems, sort, sortDir)}
              key={section.id}
              readOnly={isCompleted}
              title={section.label}
            />
          );
        })}
      </div>
    </section>
  );
}

function SortControls({
  actingUserId,
  listId,
  sort,
  sortDir,
}: {
  actingUserId?: string;
  listId?: string;
  sort: ShoppingSort;
  sortDir: SortDirection;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-zinc-500 sm:gap-2 sm:text-xs sm:tracking-[0.12em]">
      <span className="mr-0.5 shrink-0 tracking-[0.14em] sm:mr-1">Orden</span>
      <SortLink
        actingUserId={actingUserId}
        field="name"
        label="Nombre"
        listId={listId}
        sort={sort}
        sortDir={sortDir}
      />
      <SortLink
        actingUserId={actingUserId}
        field="category"
        label="Categoría"
        listId={listId}
        sort={sort}
        sortDir={sortDir}
      />
      <SortLink
        actingUserId={actingUserId}
        field="tag"
        label="Etiqueta"
        listId={listId}
        sort={sort}
        sortDir={sortDir}
      />
    </div>
  );
}

function SortLink({
  actingUserId,
  field,
  label,
  listId,
  sort,
  sortDir,
}: {
  actingUserId?: string;
  field: Exclude<ShoppingSort, ''>;
  label: string;
  listId?: string;
  sort: ShoppingSort;
  sortDir: SortDirection;
}) {
  const isActive = sort === field;
  const indicator = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '';
  return (
    <Link
      className={`inline-flex h-6 shrink-0 items-center justify-center rounded-full border px-2 leading-none transition hover:border-zinc-950 sm:h-7 sm:px-3 ${
        isActive ? 'border-zinc-950 text-zinc-950' : 'border-zinc-200'
      }`}
      href={sortHref(field, sort, sortDir, actingUserId, listId)}
    >
      <span>{label}</span>
      {indicator ? (
        <span className="ml-1 text-[0.62rem] sm:text-xs">{indicator}</span>
      ) : null}
    </Link>
  );
}

function ShoppingSection({
  actingUserId,
  defaultOpen,
  items,
  readOnly,
  title,
}: {
  actingUserId?: string;
  defaultOpen: boolean;
  items: EnrichedShoppingItem[];
  readOnly: boolean;
  title: string;
}) {
  return (
    <details className="rounded-lg bg-zinc-50 p-3" open={defaultOpen}>
      <summary className="cursor-pointer list-none text-sm font-semibold">
        {title} <span className="text-zinc-500">({items.length})</span>
      </summary>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <ShoppingItem
              actingUserId={actingUserId}
              item={item}
              key={item.id}
              readOnly={readOnly}
            />
          ))
        ) : (
          <p className="text-sm text-zinc-500">Sin ingredientes</p>
        )}
      </div>
    </details>
  );
}

function ShoppingItem({
  actingUserId,
  item,
  readOnly,
}: {
  actingUserId?: string;
  item: EnrichedShoppingItem;
  readOnly: boolean;
}) {
  const nextChecked = item.isChecked ? 'false' : 'true';
  const isProtectedResolvedItem =
    item.section === 'pantry' || item.section === 'recipe_excluded';
  const isReadOnly = readOnly || isProtectedResolvedItem;
  const isResolved = item.section !== 'missing' || item.isChecked;
  const quantity = round(item.finalQuantity || item.requiredQuantity);
  const itemTextClassName = isResolved
    ? 'text-zinc-400 line-through decoration-zinc-400 decoration-2'
    : 'text-zinc-950';
  const mutedTextClassName = isResolved
    ? 'text-zinc-400 line-through decoration-zinc-400'
    : 'text-zinc-500';
  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 transition sm:px-3 ${
        isResolved
          ? 'border-zinc-100 bg-zinc-50 text-zinc-400'
          : 'border-zinc-200 bg-white text-zinc-950'
      }`}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem_1.75rem] items-center gap-1.5 sm:grid-cols-[minmax(7rem,1fr)_minmax(5.25rem,6.5rem)_3.25rem_minmax(7.5rem,9.5rem)_2rem] sm:gap-3">
        <details className="min-w-0">
          <summary className="cursor-pointer list-none">
            <span
              className={`block truncate text-[0.78rem] font-semibold sm:text-sm ${itemTextClassName}`}
            >
              {item.ingredientName}
            </span>
            <span
              className={`mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6rem] leading-tight sm:hidden ${mutedTextClassName}`}
            >
              <span className="inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap">
                <span className="truncate">{item.macroLabel}</span>
                <span className="truncate">{item.categoryName}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                {round(item.nutrition.kcal)} kcal
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                {round(item.nutrition.protein)}P {round(item.nutrition.fat)}G{' '}
                {round(item.nutrition.carbs)}H
              </span>
            </span>
          </summary>
          <p
            className={`mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] sm:text-xs ${mutedTextClassName}`}
          >
            {item.sourceDetails.length > 0
              ? 'Detalle por receta'
              : 'Sin recetas'}
          </p>
          {item.sourceDetails.length > 0 ? (
            <div className="mt-1.5 grid gap-1">
              {item.sourceDetails.map((detail, index) => (
                <div
                  className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md bg-white/70 px-2 py-1 text-[0.62rem] leading-tight sm:bg-transparent sm:px-0 sm:text-xs ${mutedTextClassName}`}
                  key={`${item.id}:${detail.mealDate}:${detail.mealSlot}:${detail.recipeTitle}:${index}`}
                >
                  <span className="min-w-0">
                    <span className="block break-words font-semibold">
                      {detail.recipeTitle}
                    </span>
                    <span className="mt-0.5 block break-words">
                      {weekdayName(detail.mealDate)}{' '}
                      {formatShortDate(detail.mealDate)} ·{' '}
                      {mealSlotLabel(detail.mealSlot)}
                      {detail.servings > 1 ? ` · X ${detail.servings}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-semibold tabular-nums">
                    {round(detail.quantity)} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {item.pantryQuantity > 0 ? (
            <p className={`mt-1 text-xs ${mutedTextClassName}`}>
              Necesario {round(item.requiredQuantity)} {item.unit}, despensa{' '}
              {round(item.pantryQuantity)} {item.unit}
            </p>
          ) : null}
        </details>
        <div
          className={`hidden min-w-0 text-[0.64rem] leading-tight sm:block ${mutedTextClassName}`}
        >
          <span className="block truncate">{item.macroLabel}</span>
          <span className="block truncate">{item.categoryName}</span>
        </div>
        <div className="min-w-0 text-right">
          <p
            className={`text-sm font-semibold tabular-nums leading-none sm:text-base ${itemTextClassName}`}
          >
            {quantity}
          </p>
          <p
            className={`mt-0.5 text-[0.6rem] uppercase tracking-[0.12em] ${mutedTextClassName}`}
          >
            {item.unit}
          </p>
        </div>
        <div
          className={`hidden min-w-0 text-right text-[0.6rem] tabular-nums leading-tight sm:block ${mutedTextClassName}`}
        >
          <p className="truncate">
            {round(item.nutrition.kcal)} kcal
            <span> · {round(item.nutrition.protein)}P</span>
          </p>
          <p className="truncate">
            {round(item.nutrition.fat)}G · {round(item.nutrition.carbs)}H
          </p>
        </div>
        {isReadOnly ? (
          <span
            aria-label={`${item.ingredientName} ${
              isProtectedResolvedItem && !readOnly ? 'protegido' : 'completado'
            }`}
            className="grid size-7 justify-self-end place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-400 sm:size-8 sm:text-sm"
            title={
              isProtectedResolvedItem && !readOnly
                ? 'Resuelto por despensa o receta quitada'
                : 'Lista completada'
            }
          >
            ✓
          </span>
        ) : (
          <form
            action={updateShoppingListItemAction}
            className="justify-self-end"
          >
            <input
              name="actingUserId"
              type="hidden"
              value={actingUserId ?? ''}
            />
            <input name="id" type="hidden" value={item.id} />
            <input name="isChecked" type="hidden" value={nextChecked} />
            <button
              aria-label={`${item.isChecked ? 'Desticar' : 'Tickar'} ${item.ingredientName}`}
              className={
                item.isChecked
                  ? checkedToggleClassName
                  : 'grid size-7 place-items-center rounded-full border border-zinc-200 text-xs text-zinc-400 transition hover:border-zinc-950 hover:text-zinc-950 sm:size-8 sm:text-sm'
              }
              title={item.isChecked ? 'Desticar' : 'Tickar'}
            >
              ✓
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ArchivedLists({
  actingUserId,
  selectedListId,
  shoppingLists,
}: {
  actingUserId?: string;
  selectedListId?: string;
  shoppingLists: ChopItShoppingList[];
}) {
  if (shoppingLists.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 border-t border-zinc-200 pt-6">
      <h2 className="text-lg font-semibold">Archivadas</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shoppingLists.map((shoppingList) => (
          <Link
            className={`group rounded-lg border p-4 transition hover:border-zinc-950 hover:bg-zinc-50 ${
              selectedListId === shoppingList.id
                ? 'border-zinc-950 bg-zinc-50'
                : 'border-zinc-200'
            }`}
            href={shoppingListsHref({ actingUserId, listId: shoppingList.id })}
            key={shoppingList.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{shoppingList.title}</p>
                  <ShoppingListStatusBadge shoppingList={shoppingList} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {shoppingList.startDate} a {shoppingList.endDate}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {
                    shoppingList.items.filter(
                      (item) => item.section === 'missing',
                    ).length
                  }{' '}
                  faltantes ·{' '}
                  {
                    shoppingList.items.filter(
                      (item) => item.section === 'bought',
                    ).length
                  }{' '}
                  comprados
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-zinc-200 text-sm text-zinc-500 transition group-hover:border-zinc-950 group-hover:text-zinc-950">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ actingUserId }: { actingUserId?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-5 py-12 text-center">
      <p className="text-sm font-semibold">Sin lista actual</p>
      <p className="mt-2 text-sm text-zinc-500">
        Genera una lista desde las recetas asignadas en el plan.
      </p>
      <Link
        className={`mt-4 ${secondaryButtonClassName}`}
        href={plansHref(actingUserId)}
      >
        Ir a planes
      </Link>
    </div>
  );
}

const secondaryButtonClassName =
  'inline-flex h-11 items-center justify-center rounded-md border border-zinc-950 px-4 text-sm font-semibold transition hover:bg-zinc-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const checkedToggleClassName =
  'grid size-7 place-items-center rounded-full bg-zinc-950 text-xs font-semibold text-white transition hover:bg-zinc-800 sm:size-8 sm:text-sm';

function enrichShoppingItems(
  items: ChopItShoppingListItem[],
  ingredients: ChopItIngredient[],
  categories: ChopItCategory[],
): EnrichedShoppingItem[] {
  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const categoryById = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  return items.map((item) => {
    const ingredient = ingredientById.get(item.ingredientId);
    const quantity = item.finalQuantity || item.requiredQuantity;
    return {
      ...item,
      categoryName: ingredient
        ? (categoryById.get(ingredient.secondaryCategoryId) ?? 'Sin etiqueta')
        : 'Sin etiqueta',
      macroLabel: ingredient
        ? macroTagLabel(ingredient.primaryMacroTag)
        : 'Sin categoría',
      nutrition: ingredient
        ? {
            carbs: (ingredient.carbsPer100 * quantity) / 100,
            fat: (ingredient.fatPer100 * quantity) / 100,
            kcal: (ingredient.kcalPer100 * quantity) / 100,
            protein: (ingredient.proteinPer100 * quantity) / 100,
          }
        : { carbs: 0, fat: 0, kcal: 0, protein: 0 },
    };
  });
}

function sortShoppingItems(
  items: EnrichedShoppingItem[],
  sort: ShoppingSort,
  sortDir: SortDirection,
): EnrichedShoppingItem[] {
  if (!sort) {
    return items;
  }
  const direction = sortDir === 'desc' ? -1 : 1;
  return [...items].sort((left, right) => {
    const leftValue =
      sort === 'category'
        ? left.macroLabel
        : sort === 'tag'
          ? left.categoryName
          : left.ingredientName;
    const rightValue =
      sort === 'category'
        ? right.macroLabel
        : sort === 'tag'
          ? right.categoryName
          : right.ingredientName;
    return leftValue.localeCompare(rightValue) * direction;
  });
}

function shoppingSectionItems(
  items: EnrichedShoppingItem[],
  section: ChopItShoppingListItem['section'],
): EnrichedShoppingItem[] {
  if (section !== 'pantry') {
    return items.filter((item) => item.section === section);
  }
  const fullPantryItems = items.filter((item) => item.section === 'pantry');
  const partialPantryItems = items
    .filter((item) => item.section === 'missing' && item.pantryQuantity > 0)
    .map((item) => pantryDisplayItem(item));
  return [...fullPantryItems, ...partialPantryItems];
}

function pantryDisplayItem(item: EnrichedShoppingItem): EnrichedShoppingItem {
  const ratio =
    item.requiredQuantity > 0 ? item.pantryQuantity / item.requiredQuantity : 0;
  return {
    ...item,
    id: `${item.id}:pantry`,
    section: 'pantry',
    requiredQuantity: item.pantryQuantity,
    finalQuantity: item.pantryQuantity,
    isChecked: true,
    nutrition: {
      carbs: item.nutrition.carbs * ratio,
      fat: item.nutrition.fat * ratio,
      kcal: item.nutrition.kcal * ratio,
      protein: item.nutrition.protein * ratio,
    },
  };
}

function shoppingSortFromParam(value?: string): ShoppingSort {
  if (value === 'name' || value === 'category' || value === 'tag') {
    return value;
  }
  return '';
}

function sortDirectionFromParam(value?: string): SortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

function sortHref(
  field: Exclude<ShoppingSort, ''>,
  sort: ShoppingSort,
  sortDir: SortDirection,
  actingUserId?: string,
  listId?: string,
) {
  const params = new URLSearchParams();
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  if (listId) {
    params.set('listId', listId);
  }
  if (sort !== field) {
    params.set('sort', field);
    params.set('dir', 'asc');
  } else if (sortDir === 'asc') {
    params.set('sort', field);
    params.set('dir', 'desc');
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  return `/chop-it/shopping-lists${suffix}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function nullableString(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function macroTagLabel(tag: ChopItIngredient['primaryMacroTag']): string {
  if (tag === 'protein') {
    return 'Proteina';
  }
  if (tag === 'fat') {
    return 'Grasa';
  }
  return 'Hidrato';
}

function weekdayName(date: string): string {
  const names = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado',
  ];
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return names[day] ?? date;
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T00:00:00Z`));
}

function mealSlotLabel(slotId: string): string {
  if (slotId === 'breakfast') {
    return 'Desayuno';
  }
  if (slotId === 'snack_morning') {
    return 'Almuerzo';
  }
  if (slotId === 'lunch') {
    return 'Comida';
  }
  if (slotId === 'snack_afternoon') {
    return 'Merienda';
  }
  if (slotId === 'dinner') {
    return 'Cena';
  }
  return slotId;
}

function chopItHomeHref(actingUserId?: string): string {
  if (!actingUserId) {
    return '/chop-it';
  }
  return `/chop-it?actingUserId=${encodeURIComponent(actingUserId)}`;
}

function shoppingListsHref({
  actingUserId,
  listId,
}: {
  actingUserId?: string;
  listId?: string;
} = {}): string {
  const params = new URLSearchParams();
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  if (listId) {
    params.set('listId', listId);
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  return `/chop-it/shopping-lists${suffix}`;
}

function plansHref(actingUserId?: string): string {
  if (!actingUserId) {
    return '/chop-it/plans';
  }
  return `/chop-it/plans?actingUserId=${encodeURIComponent(actingUserId)}`;
}
