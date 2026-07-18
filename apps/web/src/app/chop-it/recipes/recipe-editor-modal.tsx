'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ArchiveIcon, CloseIcon, SaveIcon } from '@/components/action-icons';
import type {
  ChopItCategory,
  ChopItIngredient,
  ChopItRecipe,
} from '@/features/chop-it/types';

import { SprayHelpDisclosure } from './spray-help-disclosure';

type RecipeFormAction = (formData: FormData) => void | Promise<void>;

type SelectedIngredient = {
  ingredientId: string;
  quantity: number;
};

export function RecipeEditorModal({
  action,
  actingUserId,
  archiveAction,
  categories,
  closeHref,
  ingredients,
  mode,
  oilReference,
  recipe,
}: {
  action: RecipeFormAction;
  actingUserId?: string;
  archiveAction?: RecipeFormAction;
  categories: ChopItCategory[];
  closeHref: string;
  ingredients: ChopItIngredient[];
  mode: 'create' | 'edit';
  oilReference?: ChopItIngredient;
  recipe?: ChopItRecipe;
}) {
  const [oilMode, setOilMode] = useState<ChopItRecipe['oilMode']>(
    recipe?.oilMode ?? 'none',
  );
  const [selectedIngredients, setSelectedIngredients] = useState<
    SelectedIngredient[]
  >(
    recipe?.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      quantity: ingredient.quantity,
    })) ?? [],
  );
  const [isIngredientPickerOpen, setIsIngredientPickerOpen] = useState(false);
  const [ingredientQuery, setIngredientQuery] = useState('');

  const ingredientById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const visibleIngredients = useMemo(() => {
    const normalizedQuery = ingredientQuery.trim().toLowerCase();
    const selectedIds = new Set(
      selectedIngredients.map((ingredient) => ingredient.ingredientId),
    );
    return ingredients
      .filter((ingredient) => !selectedIds.has(ingredient.id))
      .filter((ingredient) =>
        ingredient.name.toLowerCase().includes(normalizedQuery),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [ingredientQuery, ingredients, selectedIngredients]);

  const formId = recipe ? `recipe-editor-${recipe.id}` : 'recipe-editor-create';
  const title =
    mode === 'create' ? 'Añadir receta' : `Editar ${recipe?.title ?? 'receta'}`;

  function addIngredient(ingredientId: string) {
    setSelectedIngredients((current) => [
      ...current,
      { ingredientId, quantity: 100 },
    ]);
    setIngredientQuery('');
    setIsIngredientPickerOpen(false);
  }

  function updateQuantity(ingredientId: string, quantity: number) {
    setSelectedIngredients((current) =>
      current.map((ingredient) =>
        ingredient.ingredientId === ingredientId
          ? { ...ingredient, quantity }
          : ingredient,
      ),
    );
  }

  function removeIngredient(ingredientId: string) {
    setSelectedIngredients((current) =>
      current.filter((ingredient) => ingredient.ingredientId !== ingredientId),
    );
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/30 px-4 py-6">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Receta
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {title}
            </h2>
          </div>
          <Link
            aria-label="Cerrar"
            className={modalCloseClassName}
            href={closeHref}
          >
            <CloseIcon className="size-5" />
          </Link>
        </div>

        <div className="max-h-[calc(90vh-5rem)] overflow-auto">
          <form action={action} className="grid gap-4 p-4" id={formId}>
            {actingUserId ? (
              <input name="actingUserId" type="hidden" value={actingUserId} />
            ) : null}
            {recipe ? (
              <input name="id" type="hidden" value={recipe.id} />
            ) : null}
            {selectedIngredients.map((ingredient) => (
              <input
                key={`${ingredient.ingredientId}-id`}
                name="ingredientId"
                type="hidden"
                value={ingredient.ingredientId}
              />
            ))}
            {selectedIngredients.map((ingredient) => (
              <input
                key={`${ingredient.ingredientId}-quantity`}
                name="quantity"
                type="hidden"
                value={ingredient.quantity}
              />
            ))}

            <Field label="Titulo">
              <input
                className={inputClassName}
                defaultValue={recipe?.title ?? ''}
                name="title"
                placeholder="Pollo plancha"
                required
              />
            </Field>
            <Field label="Descripcion">
              <textarea
                className="min-h-32 w-full rounded-md border border-zinc-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                defaultValue={recipe?.description ?? ''}
                name="description"
                placeholder="Pasos, notas y contexto de la receta"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minutos">
                <input
                  className={inputClassName}
                  defaultValue={recipe?.prepTimeMinutes ?? ''}
                  min="0"
                  name="prepTimeMinutes"
                  required
                  type="number"
                />
              </Field>
              <Field label="Raciones">
                <input
                  className={inputClassName}
                  defaultValue={recipe?.servings ?? ''}
                  min="1"
                  name="servings"
                  required
                  type="number"
                />
              </Field>
            </div>
            <Field label="Imagen URL">
              <input
                className={inputClassName}
                defaultValue={recipe?.imageUrl ?? ''}
                name="imageUrl"
                placeholder="https://..."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Aceite">
                <select
                  className={inputClassName}
                  name="oilMode"
                  onChange={(event) =>
                    setOilMode(event.target.value as ChopItRecipe['oilMode'])
                  }
                  value={oilMode}
                >
                  <option value="none">Sin aceite</option>
                  <option value="spray">Spray</option>
                  <option value="grams">Gramos</option>
                </select>
              </Field>
              {oilMode === 'spray' ? (
                <div className="grid gap-1.5 text-sm font-medium text-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`${formId}-oil-sprays`}>Sprays</label>
                    <SprayHelpDisclosure
                      gramsPerSpray={oilReference?.gramsPerSpray ?? 1}
                    />
                  </div>
                  <input
                    className={inputClassName}
                    defaultValue={recipe?.oilSprays ?? 1}
                    id={`${formId}-oil-sprays`}
                    max="5"
                    min="1"
                    name="oilSprays"
                    type="number"
                  />
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                    Los sprays usan el ingrediente{' '}
                    <span className="font-semibold">
                      {oilReference?.name ?? 'aceite'}
                    </span>{' '}
                    como referencia. Edita ese ingrediente para cambiar gramos
                    por spray y macros.
                  </p>
                </div>
              ) : null}
              {oilMode === 'grams' ? (
                <Field label="Gramos aceite">
                  <input
                    className={inputClassName}
                    defaultValue={recipe?.oilGrams ?? ''}
                    min="0"
                    name="oilGrams"
                    step="0.1"
                    type="number"
                  />
                </Field>
              ) : null}
            </div>

            <section className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Ingredientes</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Añade ingredientes desde el buscador y ajusta cantidades.
                  </p>
                </div>
                <button
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-lg font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                  onClick={() => setIsIngredientPickerOpen(true)}
                  type="button"
                >
                  +
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {selectedIngredients.length > 0 ? (
                  selectedIngredients.map((selectedIngredient) => {
                    const ingredient = ingredientById.get(
                      selectedIngredient.ingredientId,
                    );
                    const nutrition = ingredientNutrition(
                      ingredient,
                      selectedIngredient.quantity,
                    );
                    return (
                      <div
                        className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:grid-cols-[1fr_10rem_7.5rem_2.25rem] sm:items-center"
                        key={selectedIngredient.ingredientId}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {ingredient?.name ??
                              selectedIngredient.ingredientId}
                          </p>
                          {ingredient ? (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                              <span
                                className={tagPillClassName(
                                  ingredient.primaryMacroTag,
                                )}
                              >
                                {macroTagLabel(ingredient.primaryMacroTag)}
                              </span>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600">
                                {categoryById.get(
                                  ingredient.secondaryCategoryId,
                                ) ?? 'Sin etiqueta'}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <div className="relative">
                          <input
                            className={`${inputClassName} pr-10`}
                            min="0"
                            onChange={(event) =>
                              updateQuantity(
                                selectedIngredient.ingredientId,
                                Number(event.target.value),
                              )
                            }
                            step="0.1"
                            type="number"
                            value={selectedIngredient.quantity}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-sm font-medium text-zinc-500">
                            {ingredient?.unit ?? ''}
                          </span>
                        </div>
                        <div className="text-right text-xs tabular-nums text-zinc-500">
                          <p className="font-semibold text-zinc-950">
                            {round(nutrition.kcal)} kcal
                          </p>
                          <p>
                            {round(nutrition.protein)}P · {round(nutrition.fat)}
                            G · {round(nutrition.carbs)}H
                          </p>
                        </div>
                        <button
                          aria-label={`Quitar ${ingredient?.name ?? selectedIngredient.ingredientId}`}
                          className="grid size-9 place-items-center justify-self-end rounded-full bg-red-600 text-lg font-semibold leading-none text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                          onClick={() =>
                            removeIngredient(selectedIngredient.ingredientId)
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                    Sin ingredientes. Pulsa + para añadir el primero.
                  </p>
                )}
              </div>
            </section>
          </form>

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 p-4">
            <button
              aria-label={mode === 'create' ? 'Añadir receta' : 'Guardar'}
              className={saveIconButtonClassName}
              form={formId}
              title={mode === 'create' ? 'Añadir receta' : 'Guardar'}
            >
              <SaveIcon className="size-5" />
            </button>
            {recipe && archiveAction ? (
              <form action={archiveAction}>
                <input name="id" type="hidden" value={recipe.id} />
                <button
                  aria-label="Archivar"
                  className={archiveIconButtonClassName}
                  title="Archivar"
                >
                  <ArchiveIcon className="size-5" />
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      {isIngredientPickerOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 px-4 py-6">
          <section className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Añadir ingrediente</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Busca y selecciona un ingrediente.
                </p>
              </div>
              <button
                aria-label="Cerrar"
                className={modalCloseClassName}
                onClick={() => setIsIngredientPickerOpen(false)}
                type="button"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <input
              className={`${inputClassName} mt-4`}
              onChange={(event) => setIngredientQuery(event.target.value)}
              placeholder="Buscar ingrediente"
              value={ingredientQuery}
            />
            <div className="mt-3 grid max-h-80 gap-2 overflow-auto">
              {visibleIngredients.length > 0 ? (
                visibleIngredients.map((ingredient) => (
                  <button
                    className="rounded-md border border-zinc-200 px-3 py-3 text-left text-sm font-semibold transition hover:border-zinc-950"
                    key={ingredient.id}
                    onClick={() => addIngredient(ingredient.id)}
                    type="button"
                  >
                    {ingredient.name}
                    <span className="mt-1 block text-xs font-normal text-zinc-500">
                      {ingredient.kcalPer100} kcal/100{ingredient.unit}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                  Sin resultados.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
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

function ingredientNutrition(
  ingredient: ChopItIngredient | undefined,
  quantity: number,
) {
  if (!ingredient) {
    return { carbs: 0, fat: 0, kcal: 0, protein: 0 };
  }
  const factor = quantity / 100;
  return {
    carbs: ingredient.carbsPer100 * factor,
    fat: ingredient.fatPer100 * factor,
    kcal: ingredient.kcalPer100 * factor,
    protein: ingredient.proteinPer100 * factor,
  };
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

function tagPillClassName(tag: ChopItIngredient['primaryMacroTag']): string {
  if (tag === 'protein') {
    return 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700';
  }
  if (tag === 'fat') {
    return 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700';
  }
  return 'rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700';
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

const inputClassName =
  'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const modalCloseClassName =
  'grid size-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950';
const saveIconButtonClassName =
  'grid size-11 place-items-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';
const archiveIconButtonClassName =
  'grid size-11 place-items-center rounded-full border border-red-100 bg-red-50 text-red-700 transition hover:border-red-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30';
