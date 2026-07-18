'use client';

import { useState } from 'react';

type MacroValues = {
  carbs: string;
  fat: string;
  kcal: string;
  protein: string;
};

type MacroMode = 'per100' | 'custom';

type MacroTarget = {
  inputName: keyof MacroValues;
  label: string;
  name: keyof IngredientMacroDefaults;
};

type IngredientMacroDefaults = {
  carbsPer100?: number;
  fatPer100?: number;
  kcalPer100?: number;
  proteinPer100?: number;
};

const macroTargets: MacroTarget[] = [
  { inputName: 'kcal', label: 'Kcal', name: 'kcalPer100' },
  { inputName: 'protein', label: 'Prot.', name: 'proteinPer100' },
  { inputName: 'fat', label: 'Grasa', name: 'fatPer100' },
  { inputName: 'carbs', label: 'Hidr.', name: 'carbsPer100' },
];

const customMacroTargets: MacroTarget[] = [
  { inputName: 'kcal', label: 'Kcal en esa cantidad', name: 'kcalPer100' },
  {
    inputName: 'protein',
    label: 'Proteina en esa cantidad',
    name: 'proteinPer100',
  },
  { inputName: 'fat', label: 'Grasa en esa cantidad', name: 'fatPer100' },
  {
    inputName: 'carbs',
    label: 'Hidratos en esa cantidad',
    name: 'carbsPer100',
  },
];

export function IngredientMacroEntry({
  defaults,
  inputClassName,
}: {
  defaults: IngredientMacroDefaults;
  inputClassName: string;
}) {
  const [mode, setMode] = useState<MacroMode>('per100');
  const [per100Values, setPer100Values] = useState<MacroValues>({
    carbs: valueFromDefault(defaults.carbsPer100),
    fat: valueFromDefault(defaults.fatPer100),
    kcal: valueFromDefault(defaults.kcalPer100),
    protein: valueFromDefault(defaults.proteinPer100),
  });
  const [customQuantity, setCustomQuantity] = useState('');
  const [customValues, setCustomValues] = useState<MacroValues>({
    carbs: '',
    fat: '',
    kcal: '',
    protein: '',
  });
  const normalizedValues = normalizeCustomValues(customQuantity, customValues);

  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_15rem] sm:items-end">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Valores nutricionales
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            El ingrediente siempre se guarda normalizado por cada 100 g/ml.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
          <span>Modo de entrada</span>
          <select
            className={inputClassName}
            onChange={(event) => setMode(event.target.value as MacroMode)}
            value={mode}
          >
            <option value="per100">Valores por 100 g/ml</option>
            <option value="custom">Valores por cantidad concreta</option>
          </select>
        </label>
      </div>

      {mode === 'per100' ? (
        <div>
          <p className="text-xs leading-5 text-zinc-500">
            Usa este modo si ya tienes los macros por cada 100 g o 100 ml.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {macroTargets.map((target) => (
              <MacroField
                inputClassName={inputClassName}
                key={target.name}
                label={target.label}
                name={target.name}
                onChange={(value) =>
                  setPer100Values((current) => ({
                    ...current,
                    [target.inputName]: value,
                  }))
                }
                value={per100Values[target.inputName]}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          {macroTargets.map((target) => (
            <input
              key={target.name}
              name={target.name}
              type="hidden"
              value={normalizedValues[target.inputName]}
            />
          ))}
          <p className="text-xs leading-5 text-zinc-500">
            Usa este modo si una etiqueta o app te da macros para una cantidad
            concreta. Se recalculan antes de guardar.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            <label className="grid gap-1 text-xs font-medium text-zinc-700">
              <span>Cantidad original</span>
              <input
                className={inputClassName}
                inputMode="decimal"
                onChange={(event) => setCustomQuantity(event.target.value)}
                placeholder="50"
                required
                type="text"
                value={customQuantity}
              />
            </label>
            {customMacroTargets.map((target) => (
              <label
                className="grid gap-1 text-xs font-medium text-zinc-700"
                key={target.inputName}
              >
                <span>{target.label}</span>
                <input
                  className={inputClassName}
                  inputMode="decimal"
                  onChange={(event) =>
                    setCustomValues((current) => ({
                      ...current,
                      [target.inputName]: event.target.value,
                    }))
                  }
                  placeholder="0"
                  type="text"
                  value={customValues[target.inputName]}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MacroField({
  inputClassName,
  label,
  name,
  onChange,
  value,
}: {
  inputClassName: string;
  label: string;
  name: keyof IngredientMacroDefaults;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      <input
        className={inputClassName}
        inputMode="decimal"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        type="text"
        value={value}
      />
    </label>
  );
}

function normalizeCustomValues(
  quantityValue: string,
  values: MacroValues,
): MacroValues {
  const quantity = decimalValue(quantityValue);
  if (quantity <= 0) {
    return { carbs: '', fat: '', kcal: '', protein: '' };
  }
  return {
    carbs: formatDecimal((decimalValue(values.carbs) / quantity) * 100),
    fat: formatDecimal((decimalValue(values.fat) / quantity) * 100),
    kcal: formatDecimal((decimalValue(values.kcal) / quantity) * 100),
    protein: formatDecimal((decimalValue(values.protein) / quantity) * 100),
  };
}

function valueFromDefault(value?: number): string {
  return value === undefined ? '' : formatDecimal(value);
}

function decimalValue(value: string): number {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}
