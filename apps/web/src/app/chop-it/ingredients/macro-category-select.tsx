'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

type MacroCategorySelectProps = {
  className: string;
  defaultValue: 'protein' | 'fat' | 'carb';
  name: string;
  required?: boolean;
};

export function MacroCategorySelect({
  className,
  defaultValue,
  name,
  required = false,
}: MacroCategorySelectProps) {
  const [value, setValue] = useState(defaultValue);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual) {
      return;
    }
    const form = document.querySelector<HTMLFormElement>(
      `select[name="${name}"]`,
    )?.form;
    if (!form) {
      return;
    }
    const updateValue = () => {
      const protein = decimalInputValue(form, 'proteinPer100');
      const fat = decimalInputValue(form, 'fatPer100');
      const carbs = decimalInputValue(form, 'carbsPer100');
      setValue(detectMacroCategory({ protein, fat, carbs }));
    };
    updateValue();
    form.addEventListener('input', updateValue);
    return () => form.removeEventListener('input', updateValue);
  }, [manual, name]);

  return (
    <select
      className={className}
      name={name}
      onChange={(event) => {
        setManual(true);
        setValue(event.target.value as 'protein' | 'fat' | 'carb');
      }}
      required={required}
      style={macroSelectStyle(value)}
      value={value}
    >
      <option value="protein">Protein</option>
      <option value="fat">Fat</option>
      <option value="carb">Carbs</option>
    </select>
  );
}

function decimalInputValue(form: HTMLFormElement, name: string): number {
  const element = form.elements.namedItem(name);
  if (!(element instanceof HTMLInputElement)) {
    return 0;
  }
  const normalized = element.value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function detectMacroCategory({
  carbs,
  fat,
  protein,
}: {
  carbs: number;
  fat: number;
  protein: number;
}): 'protein' | 'fat' | 'carb' {
  if (fat >= 8 && fat > protein && fat > carbs) {
    return 'fat';
  }
  if (protein >= 8 && protein > fat && protein > carbs) {
    return 'protein';
  }
  return 'carb';
}

function macroSelectStyle(tone: 'protein' | 'fat' | 'carb'): CSSProperties {
  if (tone === 'protein') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      color: '#047857',
    };
  }
  if (tone === 'fat') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      color: '#b45309',
    };
  }
  return {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    color: '#0369a1',
  };
}
