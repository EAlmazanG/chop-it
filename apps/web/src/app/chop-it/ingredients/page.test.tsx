import { render, screen } from '@testing-library/react';

import {
  fetchChopItCategories,
  fetchChopItIngredients,
} from '@/features/chop-it/api';

import ChopItIngredientsPage from './page';

jest.mock('@/features/chop-it/api', () => ({
  fetchChopItCategories: jest.fn(),
  fetchChopItIngredients: jest.fn(),
}));

describe('ChopItIngredientsPage', () => {
  it('renders the fictional ingredient catalog', async () => {
    jest
      .mocked(fetchChopItCategories)
      .mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Proteins',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]);
    jest.mocked(fetchChopItIngredients).mockResolvedValue([
      {
        id: 'ingredient-1',
        name: 'Pechuga de pollo',
        primaryMacroTag: 'protein',
        secondaryCategoryId: 'cat-1',
        unit: 'g',
        kcalPer100: 120,
        proteinPer100: 22,
        fatPer100: 3,
        carbsPer100: 0,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);

    render(await ChopItIngredientsPage({}));

    expect(
      screen.getByRole('heading', { name: 'Ingredients' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Pechuga de pollo' }),
    ).toBeInTheDocument();
  });
});
