'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ChopItMealPlanItem } from '@/features/chop-it/types';

type ShoppingWizardDay = {
  date: string;
  items: ChopItMealPlanItem[];
};

export function ShoppingDaysStep({
  actingUserId,
  days,
  selectedDays,
  weekStart,
}: {
  actingUserId?: string;
  days: ShoppingWizardDay[];
  selectedDays: string[];
  weekStart: string;
}) {
  const [currentSelectedDays, setCurrentSelectedDays] = useState(selectedDays);
  const selectedSet = useMemo(
    () => new Set(currentSelectedDays),
    [currentSelectedDays],
  );
  const previousWeek = dateFromOrdinal(dateOrdinal(weekStart) - 7);
  const nextWeek = dateFromOrdinal(dateOrdinal(weekStart) + 7);
  const canContinue = currentSelectedDays.length > 0;

  function toggleDay(day: string, checked: boolean) {
    setCurrentSelectedDays((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(day);
      } else {
        next.delete(day);
      }
      return Array.from(next).sort(
        (left, right) => dateOrdinal(left) - dateOrdinal(right),
      );
    });
  }

  return (
    <form
      action="/chop-it/plans"
      className="flex max-h-[calc(88vh-5.5rem)] min-h-0 flex-col gap-4 p-4"
    >
      {actingUserId ? (
        <input name="actingUserId" type="hidden" value={actingUserId} />
      ) : null}
      <input name="weekStart" type="hidden" value={weekStart} />
      {currentSelectedDays.map((day) => (
        <input key={day} name="day" type="hidden" value={day} />
      ))}
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <Link
          className={`${secondaryButtonClassName} h-10 px-3`}
          href={shoppingWizardHref({
            actingUserId,
            selectedDays: currentSelectedDays,
            step: 'days',
            weekStart: previousWeek,
          })}
        >
          ← Semana
        </Link>
        <p className="text-sm text-zinc-500 sm:text-center">
          {currentSelectedDays.length}{' '}
          {currentSelectedDays.length === 1
            ? 'dia seleccionado'
            : 'dias seleccionados'}
        </p>
        <Link
          className={`${secondaryButtonClassName} h-10 px-3`}
          href={shoppingWizardHref({
            actingUserId,
            selectedDays: currentSelectedDays,
            step: 'days',
            weekStart: nextWeek,
          })}
        >
          Semana →
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((day) => (
          <label
            className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 transition hover:border-zinc-950"
            key={day.date}
          >
            <span>
              <span className="block text-sm font-semibold">
                {weekdayName(day.date)}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                {formatShortDate(day.date)} · {day.items.length} comidas
              </span>
            </span>
            <input
              checked={selectedSet.has(day.date)}
              onChange={(event) => toggleDay(day.date, event.target.checked)}
              type="checkbox"
            />
          </label>
        ))}
      </div>
      {!canContinue ? (
        <p className="text-sm text-zinc-500">
          Selecciona al menos un dia para continuar.
        </p>
      ) : null}
      <div className="flex shrink-0 justify-center border-t border-zinc-100 bg-white pt-4">
        <button
          className={`${primaryButtonClassName} w-full sm:w-auto`}
          disabled={!canContinue}
          name="shoppingStep"
          type="submit"
          value="recipes"
        >
          Siguiente
        </button>
      </div>
    </form>
  );
}

const primaryButtonClassName =
  'h-11 self-end rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500';
const secondaryButtonClassName =
  'inline-flex h-11 items-center justify-center rounded-md border border-zinc-950 px-4 text-sm font-semibold transition hover:bg-zinc-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2';

function shoppingWizardHref({
  actingUserId,
  selectedDays = [],
  step,
  weekStart,
}: {
  actingUserId?: string;
  selectedDays?: string[];
  step: 'days' | 'recipes' | 'pantry';
  weekStart: string;
}): string {
  const params = new URLSearchParams({ shoppingStep: step, weekStart });
  if (actingUserId) {
    params.set('actingUserId', actingUserId);
  }
  for (const day of selectedDays) {
    params.append('day', day);
  }
  return `/chop-it/plans?${params.toString()}`;
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
  return names[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? date;
}

function formatShortDate(date: string): string {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
  return formatter.format(new Date(`${date}T00:00:00Z`)).replace('.', '');
}

function dateOrdinal(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

function dateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}
