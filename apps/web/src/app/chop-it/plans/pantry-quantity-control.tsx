'use client';

import { useState } from 'react';

type PantryQuantityControlProps = {
  ingredientId: string;
  maxQuantity: number;
  unit: string;
};

export function PantryQuantityControl({
  ingredientId,
  maxQuantity,
  unit,
}: PantryQuantityControlProps) {
  const [checked, setChecked] = useState(false);
  const roundedQuantity = Math.round(maxQuantity * 10) / 10;
  return (
    <div className="grid gap-2 sm:grid-cols-[auto_7.5rem] sm:items-center">
      <input
        name={`pantryMax:${ingredientId}`}
        type="hidden"
        value={roundedQuantity}
      />
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-700">
        <input
          checked={checked}
          className="peer sr-only"
          name={`hasPantry:${ingredientId}`}
          onChange={(event) => setChecked(event.target.checked)}
          type="checkbox"
          value="1"
        />
        <span className="grid size-8 place-items-center rounded-full border border-zinc-200 text-zinc-300 transition peer-checked:border-zinc-950 peer-checked:bg-zinc-950 peer-checked:text-white">
          ✓
        </span>
        <span>In my pantry</span>
      </label>
      <label className="grid gap-1 text-xs font-medium text-zinc-500">
        <span>Quantity</span>
        <div className="relative">
          <input
            aria-label="Quantity"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 pr-9 text-sm font-semibold tabular-nums text-zinc-950 outline-none transition disabled:bg-zinc-50 disabled:text-zinc-300 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
            defaultValue={roundedQuantity}
            disabled={!checked}
            max={roundedQuantity}
            min="0"
            name={`pantryQuantity:${ingredientId}`}
            step="0.1"
            type="number"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-semibold uppercase text-zinc-400">
            {unit}
          </span>
        </div>
      </label>
    </div>
  );
}
