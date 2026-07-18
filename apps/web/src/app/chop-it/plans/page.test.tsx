import { render, screen } from '@testing-library/react';

import {
  fetchChopItIngredients,
  fetchChopItRecipes,
  fetchChopItWeekPlan,
} from '@/features/chop-it/api';

import ChopItPlansPage from './page';

jest.mock('@/features/chop-it/api', () => ({
  fetchChopItIngredients: jest.fn(),
  fetchChopItRecipes: jest.fn(),
  fetchChopItWeekPlan: jest.fn(),
}));

describe('ChopItPlansPage', () => {
  it('renders a weekly plan for the local profile', async () => {
    jest.mocked(fetchChopItIngredients).mockResolvedValue([]);
    jest.mocked(fetchChopItRecipes).mockResolvedValue([]);
    jest.mocked(fetchChopItWeekPlan).mockResolvedValue({
      ownerUserId: 'demo',
      weekStart: '2026-07-13',
      items: [],
      days: Array.from({ length: 7 }, (_, index) => ({
        date: `2026-07-${String(13 + index).padStart(2, '0')}`,
        totalKcal: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
      })),
      weekTotals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    });

    render(
      await ChopItPlansPage({
        searchParams: Promise.resolve({ weekStart: '2026-07-13' }),
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'Planes de comida' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Generar compra' }),
    ).toBeInTheDocument();
  });
});
