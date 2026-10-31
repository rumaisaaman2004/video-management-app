import { render } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes.jsx';
import { ToastProvider } from '../components/ui/ToastProvider.jsx';

/** Renders a component that uses router links. */
export function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/** Renders the real app routes at `path`, with the same providers as the app. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  );
}
