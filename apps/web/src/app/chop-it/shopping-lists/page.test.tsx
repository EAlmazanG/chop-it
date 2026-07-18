import { render, screen } from '@testing-library/react';

import {
  fetchChopItArchivedShoppingLists,
  fetchChopItCategories,
  fetchChopItCurrentShoppingList,
  fetchChopItIngredients,
} from '@/features/chop-it/api';

import ChopItShoppingListsPage from './page';

jest.mock('@/features/chop-it/api', () => ({
  fetchChopItArchivedShoppingLists: jest.fn(),
  fetchChopItCategories: jest.fn(),
  fetchChopItCurrentShoppingList: jest.fn(),
  fetchChopItIngredients: jest.fn(),
}));

describe('ChopItShoppingListsPage', () => {
  it('renders the empty shopping-list state', async () => {
    jest.mocked(fetchChopItCurrentShoppingList).mockResolvedValue(null);
    jest.mocked(fetchChopItArchivedShoppingLists).mockResolvedValue([]);
    jest.mocked(fetchChopItCategories).mockResolvedValue([]);
    jest.mocked(fetchChopItIngredients).mockResolvedValue([]);

    render(await ChopItShoppingListsPage({}));

    expect(
      screen.getByRole('heading', { name: 'Lista de la compra' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin lista actual')).toBeInTheDocument();
  });
});
