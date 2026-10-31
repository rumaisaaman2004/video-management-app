import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render.jsx';
import { apiError, makeUser, server } from '../../test/server.js';

const ana = makeUser();

function session(user = ana) {
  return HttpResponse.json({ data: { user, accessToken: 'token-1' } });
}

async function fillIn(label, value) {
  const field = screen.getByLabelText(label);
  await userEvent.clear(field);
  if (value) await userEvent.type(field, value);
}

describe('signing in', () => {
  it('checks the fields before calling the server', async () => {
    renderApp('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription('Email is required');
    expect(screen.getByLabelText(/Password/)).toHaveAccessibleDescription('Password is required');
  });

  it('shows the server message for wrong credentials', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        apiError(401, 'UNAUTHORIZED', 'Invalid email or password'),
      ),
    );
    renderApp('/login');

    await screen.findByRole('button', { name: 'Sign in' });
    await fillIn(/Email/, 'ana@example.com');
    await fillIn(/Password/, 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('signs in, greets the user and shows their menu', async () => {
    server.use(http.post('/api/auth/login', () => session()));
    const { router } = renderApp('/login');

    await screen.findByRole('button', { name: 'Sign in' });
    await fillIn(/Email/, 'ana@example.com');
    await fillIn(/Password/, 'correct-horse-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Welcome back, Ana Lima!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ana Lima/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('creating an account', () => {
  it('requires matching passwords and a long enough password', async () => {
    renderApp('/register');

    await screen.findByRole('button', { name: 'Create account' });
    await fillIn(/^Name/, 'Ana');
    await fillIn(/^Email/, 'ana@example.com');
    await fillIn(/^Password/, 'short');
    await fillIn(/Confirm password/, 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByLabelText(/^Password/)).toHaveAccessibleDescription(
      'At least 8 characters. Password must be at least 8 characters',
    );
    expect(screen.getByLabelText(/Confirm password/)).toHaveAccessibleDescription(
      'Passwords do not match',
    );
  });

  it('shows "already registered" on the email field', async () => {
    let sentBody;
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        sentBody = await request.json();
        return apiError(409, 'CONFLICT', 'Email is already registered');
      }),
    );
    renderApp('/register');

    await screen.findByRole('button', { name: 'Create account' });
    await fillIn(/^Name/, 'Ana');
    await fillIn(/^Email/, 'ana@example.com');
    await fillIn(/^Password/, 'correct-horse-1');
    await fillIn(/Confirm password/, 'correct-horse-1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription(
        'Email is already registered',
      ),
    );
    // The confirmation is checked in the browser and never sent.
    expect(sentBody).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'correct-horse-1',
    });
  });
});

describe('protected pages', () => {
  it('sends visitors to sign in, then back to the page they wanted', async () => {
    server.use(http.post('/api/auth/login', () => session()));
    const { router } = renderApp('/account');

    await screen.findByRole('heading', { name: 'Sign in' });
    expect(router.state.location.pathname).toBe('/login');

    await fillIn(/Email/, 'ana@example.com');
    await fillIn(/Password/, 'correct-horse-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Your account' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account');
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('restores a saved session on page load', async () => {
    server.use(http.post('/api/auth/refresh', () => session(makeUser({ role: 'admin' }))));

    renderApp('/account');

    expect(await screen.findByRole('heading', { name: 'Your account' })).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});

describe('signing out', () => {
  it('ends the session and returns to the library', async () => {
    let loggedOut = false;
    server.use(
      http.post('/api/auth/refresh', () => session()),
      http.post('/api/auth/logout', () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = renderApp('/account');

    await userEvent.click(await screen.findByRole('button', { name: /Ana Lima/ }));
    const menu = screen.getByRole('button', { name: /Sign out/ }).closest('.dropdown-menu');
    await userEvent.click(within(menu).getByRole('button', { name: /Sign out/ }));

    expect(await screen.findByText('You have signed out.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(loggedOut).toBe(true);
  });
});
