import { render, screen } from '@testing-library/react';

import ChopItPage from './page';

describe('ChopItPage', () => {
  it('links the four core product flows', () => {
    render(<ChopItPage />);

    expect(
      screen.getByRole('heading', { name: /Chop It!/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Recipes/ })).toHaveAttribute(
      'href',
      '/chop-it/recipes',
    );
    expect(screen.getByRole('link', { name: /Ingredients/ })).toHaveAttribute(
      'href',
      '/chop-it/ingredients',
    );
    expect(screen.getByRole('link', { name: /Weekly plan/ })).toHaveAttribute(
      'href',
      '/chop-it/plans',
    );
    expect(
      screen.getByRole('link', { name: /Shopping list/ }),
    ).toHaveAttribute('href', '/chop-it/shopping-lists');
  });
});
