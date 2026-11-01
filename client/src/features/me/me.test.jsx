import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render.jsx';
import { makeUser, makeVideo, pageOf, server } from '../../test/server.js';

function signIn() {
  server.use(
    http.post('/api/auth/refresh', () =>
      HttpResponse.json({ data: { user: makeUser(), accessToken: 'token-1' } }),
    ),
  );
}

/** Serves a personal list and records each request's query. */
function serveList(path, respond) {
  const requests = [];
  server.use(
    http.get(path, ({ request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      requests.push(query);
      return respond(query);
    }),
  );
  return requests;
}

const inProgress = (title, id) =>
  makeVideo({
    id,
    title,
    viewer: { liked: false, bookmarked: false, progressSeconds: 50, completed: false },
  });

describe('navigation for signed-in users', () => {
  it('adds Playlists, Favourites and History', async () => {
    signIn();
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Favourites' })).toHaveAttribute(
      'href',
      '/favourites',
    );
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: 'Playlists' })).toHaveAttribute('href', '/playlists');
  });
});

describe('favourites page', () => {
  beforeEach(signIn);

  it('lists saved videos and removes one', async () => {
    let saved = [
      makeVideo({ title: 'Saved one' }),
      makeVideo({ id: 'video-2', title: 'Saved two' }),
    ];
    serveList('/api/me/bookmarks', () => pageOf(saved));
    server.use(
      http.delete('/api/videos/video-1/bookmark', () => {
        saved = saved.filter((video) => video.id !== 'video-1');
        return HttpResponse.json({ data: { bookmarked: false } });
      }),
    );
    renderApp('/favourites');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove Saved one from favourites' }),
    );

    expect(await screen.findByText('Removed “Saved one” from your favourites.')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Saved one' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Saved two' })).toBeVisible();
  });

  it('goes back a page after removing the last video on it', async () => {
    serveList('/api/me/bookmarks', (query) =>
      query.page === '2'
        ? pageOf([makeVideo({ title: 'Last one' })], { page: 2, total: 13 })
        : pageOf([makeVideo({ id: 'v-first', title: 'First page video' })], { total: 12 }),
    );
    server.use(
      http.delete('/api/videos/video-1/bookmark', () =>
        HttpResponse.json({ data: { bookmarked: false } }),
      ),
    );
    const { router } = renderApp('/favourites?page=2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove Last one from favourites' }),
    );

    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(await screen.findByRole('link', { name: 'First page video' })).toBeVisible();
  });

  it('explains how to add favourites when there are none', async () => {
    renderApp('/favourites');

    expect(await screen.findByRole('heading', { name: 'No favourites yet' })).toBeVisible();
  });
});

describe('history page', () => {
  beforeEach(signIn);

  it('switches to "Continue watching" and keeps the choice in the URL', async () => {
    const requests = serveList('/api/me/history', (query) =>
      pageOf([makeVideo({ title: query.inProgress ? 'Half watched' : 'Any video' })]),
    );
    const { router } = renderApp('/history');
    await screen.findByRole('link', { name: 'Any video' });

    await userEvent.click(screen.getByRole('button', { name: 'Continue watching' }));

    expect(await screen.findByRole('link', { name: 'Half watched' })).toBeVisible();
    expect(router.state.location.search).toBe('?view=in-progress');
    expect(requests.at(-1)).toMatchObject({ inProgress: 'true' });
    expect(screen.getByRole('button', { name: 'Continue watching' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('removes one video from history', async () => {
    let removed = false;
    serveList('/api/me/history', () => pageOf(removed ? [] : [makeVideo({ title: 'Watched' })]));
    server.use(
      http.delete('/api/me/history/video-1', () => {
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp('/history');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove Watched from history' }),
    );

    expect(await screen.findByRole('heading', { name: 'No history yet' })).toBeVisible();
  });

  it('clears all history after confirmation', async () => {
    let cleared = false;
    serveList('/api/me/history', () => pageOf(cleared ? [] : [makeVideo()]));
    server.use(
      http.delete('/api/me/history', () => {
        cleared = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp('/history');

    await userEvent.click(await screen.findByRole('button', { name: 'Clear history' }));
    const dialog = screen.getByRole('dialog', { name: 'Clear your watch history?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear history' }));

    expect(await screen.findByText('Your watch history was cleared.')).toBeVisible();
    expect(cleared).toBe(true);
    expect(await screen.findByRole('heading', { name: 'No history yet' })).toBeVisible();
  });
});

describe('continue watching in the library', () => {
  it('shows unfinished videos to signed-in users on the plain library page', async () => {
    signIn();
    const requests = serveList('/api/me/history', () =>
      pageOf([inProgress('Half watched', 'v-half')]),
    );
    renderApp('/');

    const section = await screen.findByRole('region', { name: 'Continue watching' });
    expect(within(section).getByRole('link', { name: 'Half watched' })).toBeVisible();
    expect(within(section).getByText(/40% watched/)).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ inProgress: 'true', pageSize: '4' });
  });

  it('is left out while searching and for signed-out visitors', async () => {
    const requests = serveList('/api/me/history', () =>
      pageOf([inProgress('Half watched', 'v-half')]),
    );
    renderApp('/');
    await screen.findByRole('heading', { name: 'Video library' });

    expect(screen.queryByRole('region', { name: 'Continue watching' })).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});
