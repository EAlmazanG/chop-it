'use client';

import { useState } from 'react';

type RecipeExclusionControlProps = {
  defaultExcludedServings: number;
  itemId: string;
  recipeTitle: string;
  servings: number;
};

function clampServings(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), max);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function RecipeExclusionControl({
  defaultExcludedServings,
  itemId,
  recipeTitle,
  servings,
}: RecipeExclusionControlProps) {
  const maxServings = Math.max(servings, 1);
  const initialExcludedServings = clampServings(
    defaultExcludedServings,
    maxServings,
  );
  const [checked, setChecked] = useState(initialExcludedServings > 0);
  const [excludedServings, setExcludedServings] = useState(
    initialExcludedServings > 0 ? initialExcludedServings : 1,
  );
  const visibleExcludedServings = checked
    ? clampServings(excludedServings, maxServings)
    : 0;
  const includedServings = Math.max(maxServings - visibleExcludedServings, 0);
  const hasMultipleServings = maxServings > 1;

  return (
    <div className="grid gap-2 sm:min-w-52">
      <label className="inline-flex cursor-pointer items-center justify-end gap-2 text-xs font-semibold text-zinc-600">
        <span>No contar</span>
        <input
          aria-label={`No contar ${recipeTitle}`}
          checked={checked}
          className="peer sr-only"
          name="excludedPlanItemId"
          onChange={(event) => {
            const isChecked = event.target.checked;
            setChecked(isChecked);
            if (isChecked && excludedServings <= 0) {
              setExcludedServings(1);
            }
          }}
          type="checkbox"
          value={itemId}
        />
        <span className="grid size-8 place-items-center rounded-full border border-zinc-200 text-zinc-300 transition peer-checked:border-zinc-950 peer-checked:bg-zinc-950 peer-checked:text-white">
          ✓
        </span>
      </label>
      {checked ? (
        <label className="grid gap-1 text-xs font-semibold text-zinc-500">
          <span>Raciones a no contar</span>
          <span className="grid grid-cols-[1fr_auto] items-center gap-2">
            <input
              aria-label={`Raciones a no contar de ${recipeTitle}`}
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-base font-semibold text-zinc-950 tabular-nums disabled:bg-zinc-50 disabled:text-zinc-500"
              max={maxServings}
              min={1}
              name={`excludedPlanItemServings:${itemId}`}
              onChange={(event) =>
                setExcludedServings(
                  clampServings(Number(event.target.value), maxServings),
                )
              }
              readOnly={!hasMultipleServings}
              step={1}
              type="number"
              value={hasMultipleServings ? round(visibleExcludedServings) : 1}
            />
            <span className="whitespace-nowrap text-zinc-400">
              de {round(maxServings)}
            </span>
          </span>
          <span className="text-[0.68rem] font-medium text-zinc-400">
            Se cuentan {round(includedServings)}.
          </span>
        </label>
      ) : null}
    </div>
  );
}
