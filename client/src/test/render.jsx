import { render } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes.jsx';
import { ToastProvider } from '../components/ui/ToastProvider.jsx';
import { AuthProvider } from '../features/auth/AuthProvider.jsx';

/** Renders a component that uses router links. */
export function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * Renders the real app routes at `path`, with the same providers as the app.
 * Returns the router too, so tests can check where navigation ended up.
 */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>,
  );
  return { ...result, router };
}
