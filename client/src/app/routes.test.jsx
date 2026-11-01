import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/render.jsx';

describe('app layout and routes', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-bs-theme', 'light');
  });

  it('renders the home page inside the shared layout', async () => {
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Video library' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    // The tab title is set by an effect just after render, so wait for it.
    await waitFor(() => expect(document.title).toBe('Video library · Video Library'));
  });

  it('highlights the current page in the navigation', async () => {
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Library' })).toHaveClass('active');
  });

  it('shows a not-found page for unknown addresses', async () => {
    renderApp('/no-such-page');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to the library' })).toHaveAttribute('href', '/');
  });

  it('switches to dark mode and remembers the choice', async () => {
    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Switch to dark mode' }));

    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
    expect(localStorage.getItem('color-mode')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
