import { render, screen } from '@testing-library/react';

import {
  fetchChopItArchivedRecipes,
  fetchChopItCategories,
  fetchChopItIngredients,
  fetchChopItRecipes,
} from '@/features/chop-it/api';

import ChopItRecipesPage from './page';

jest.mock('@/features/chop-it/api', () => ({
  fetchChopItArchivedRecipes: jest.fn(),
  fetchChopItCategories: jest.fn(),
  fetchChopItIngredients: jest.fn(),
  fetchChopItRecipes: jest.fn(),
}));

describe('ChopItRecipesPage', () => {
  it('renders the recipe catalog', async () => {
    jest.mocked(fetchChopItCategories).mockResolvedValue([]);
    jest.mocked(fetchChopItIngredients).mockResolvedValue([]);
    jest.mocked(fetchChopItArchivedRecipes).mockResolvedValue([]);
    jest.mocked(fetchChopItRecipes).mockResolvedValue([
      {
        id: 'recipe-1',
        title: 'Bowl mediterráneo',
        description: 'Demo recipe',
        imageUrl: null,
        prepTimeMinutes: 30,
        servings: 2,
        oilMode: 'none',
        oilSprays: null,
        oilGrams: null,
        totalKcal: 600,
        totalProtein: 50,
        totalFat: 15,
        totalCarbs: 70,
        perServingKcal: 300,
        perServingProtein: 25,
        perServingFat: 7.5,
        perServingCarbs: 35,
        ingredients: [],
        createdByUserId: 'demo',
        createdByDisplayName: 'Demo cook',
        createdByEmail: '',
        updatedByUserId: 'demo',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        archivedAt: null,
      },
    ]);

    render(await ChopItRecipesPage({}));

    expect(
      screen.getByRole('heading', { name: 'Recetas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bowl mediterráneo')).toBeInTheDocument();
  });
});
