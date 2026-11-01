import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render.jsx';
import { apiError, makePlaylist, makeUser, makeVideo, server } from '../../test/server.js';

const ana = makeUser({ id: 'user-1', name: 'Ana Lima' });
const videos = [
  makeVideo({ id: 'v1', title: 'Intro' }),
  makeVideo({ id: 'v2', title: 'Basics' }),
  makeVideo({ id: 'v3', title: 'Advanced' }),
];

function signInAs(user = ana) {
  server.use(
    http.post('/api/auth/refresh', () =>
      HttpResponse.json({ data: { user, accessToken: 'token-1' } }),
    ),
  );
}

function servePlaylist(playlist) {
  server.use(
    http.get(`/api/playlists/${playlist.id}`, () => HttpResponse.json({ data: playlist })),
  );
}

const titlesInOrder = () =>
  within(screen.getByRole('list', { name: 'Videos in this playlist' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getAllByRole('link').at(-1).textContent);

describe('my playlists page', () => {
  beforeEach(() => signInAs());

  it('requires a title before creating a playlist', async () => {
    renderApp('/playlists');

    await userEvent.click(await screen.findByRole('button', { name: 'Create a playlist' }));
    const dialog = screen.getByRole('dialog', { name: 'New playlist' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create playlist' }));

    expect(within(dialog).getByLabelText(/Title/)).toHaveAccessibleDescription('Title is required');
  });

  it('creates a playlist with a trimmed title, then opens it', async () => {
    let body;
    server.use(
      http.post('/api/playlists', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { data: makePlaylist({ id: 'p-new', title: body.title, videos: [] }) },
          { status: 201 },
        );
      }),
    );
    servePlaylist(makePlaylist({ id: 'p-new', title: 'Weekend learning', videos: [] }));
    const { router } = renderApp('/playlists');

    await userEvent.click(await screen.findByRole('button', { name: 'Create a playlist' }));
    const dialog = screen.getByRole('dialog', { name: 'New playlist' });
    // paste() enters the text in one step; typing it key by key adds nothing to this test.
    await userEvent.click(within(dialog).getByLabelText(/Title/));
    await userEvent.paste('  Weekend learning ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create playlist' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Weekend learning' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/playlists/p-new');
    expect(body).toEqual({ title: 'Weekend learning', description: '', visibility: 'private' });
  });

  it('lists playlists with their size and visibility', async () => {
    server.use(
      http.get('/api/me/playlists', () =>
        HttpResponse.json({ data: [makePlaylist({ videoCount: 3, visibility: 'public' })] }),
      ),
    );
    renderApp('/playlists');

    expect(await screen.findByRole('link', { name: 'Frontend course' })).toHaveAttribute(
      'href',
      '/playlists/playlist-1',
    );
    expect(screen.getAllByText('3 videos').length).toBeGreaterThan(0);
    expect(screen.getByText('Public')).toBeVisible();
  });
});

describe('playlist page for its owner', () => {
  beforeEach(() => {
    signInAs();
    servePlaylist(makePlaylist({ videos, videoCount: 3 }));
  });

  it('moves a video down and shows the order the server saved', async () => {
    let sentOrder;
    server.use(
      http.put('/api/playlists/playlist-1/videos/order', async ({ request }) => {
        sentOrder = (await request.json()).videoIds;
        const reordered = sentOrder.map((id) => videos.find((video) => video.id === id));
        return HttpResponse.json({ data: makePlaylist({ videos: reordered }) });
      }),
    );
    renderApp('/playlists/playlist-1');

    expect(await screen.findByRole('button', { name: 'Move Intro up' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Intro down' }));

    await waitFor(() => expect(titlesInOrder()).toEqual(['Basics', 'Intro', 'Advanced']));
    expect(sentOrder).toEqual(['v2', 'v1', 'v3']);
    expect(screen.getByText('Moved “Intro” to position 2.')).toBeInTheDocument();
  });

  it('removes a video', async () => {
    server.use(
      http.delete('/api/playlists/playlist-1/videos/v2', () =>
        HttpResponse.json({ data: makePlaylist({ videos: [videos[0], videos[2]] }) }),
      ),
    );
    renderApp('/playlists/playlist-1');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove Basics from this playlist' }),
    );

    await waitFor(() => expect(titlesInOrder()).toEqual(['Intro', 'Advanced']));
  });

  it('edits the details', async () => {
    let body;
    server.use(
      http.patch('/api/playlists/playlist-1', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: makePlaylist({ ...body, videos }) });
      }),
    );
    renderApp('/playlists/playlist-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit playlist' });
    expect(within(dialog).getByLabelText(/Title/)).toHaveValue('Frontend course');
    await userEvent.selectOptions(within(dialog).getByLabelText('Visibility'), 'public');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Playlist updated.')).toBeVisible();
    expect(body).toEqual({ title: 'Frontend course', description: '', visibility: 'public' });
    expect(screen.getByText('Public')).toBeVisible();
  });

  it('copies a share link and explains who can open it', async () => {
    // userEvent provides its own clipboard, so set it up first and read from it afterwards.
    const user = userEvent.setup();
    renderApp('/playlists/playlist-1');

    await user.click(await screen.findByRole('button', { name: 'Share' }));

    expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/playlists/playlist-1');
    expect(
      await screen.findByText(/This playlist is private, so only you can open the link/),
    ).toBeVisible();
  });

  it('deletes the playlist after confirmation', async () => {
    server.use(
      http.delete('/api/playlists/playlist-1', () => new HttpResponse(null, { status: 204 })),
    );
    const { router } = renderApp('/playlists/playlist-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete playlist' }),
    );

    expect(await screen.findByText('Deleted “Frontend course”.')).toBeVisible();
    expect(router.state.location.pathname).toBe('/playlists');
  });
});

describe('playlist page for other people', () => {
  it('shows a public playlist without editing controls', async () => {
    servePlaylist(
      makePlaylist({ visibility: 'public', owner: { id: 'someone-else', name: 'Ben' }, videos }),
    );
    renderApp('/playlists/playlist-1');

    expect(await screen.findByText('Playlist by Ben')).toBeVisible();
    expect(screen.getByRole('link', { name: /Play/ })).toHaveAttribute('href', '/videos/v1');
    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('says a private playlist was not found', async () => {
    server.use(
      http.get('/api/playlists/secret', () => apiError(404, 'NOT_FOUND', 'Playlist not found')),
    );
    renderApp('/playlists/secret');

    expect(await screen.findByRole('heading', { name: 'Playlist not found' })).toBeVisible();
  });
});

describe('saving a video to a playlist from the watch page', () => {
  // The watch page is loaded lazily by the router; load it once up front so the tests
  // do not depend on how long the first import takes.
  beforeAll(() => import('../watch/WatchPage.jsx'));

  beforeEach(() => {
    signInAs();
    server.use(
      http.get('/api/videos/video-1', () =>
        HttpResponse.json({ data: makeVideo({ renditions: [], status: 'processing' }) }),
      ),
      http.get('/api/me/playlists', () =>
        HttpResponse.json({ data: [makePlaylist({ videoCount: 2 })] }),
      ),
    );
  });

  async function openDialog() {
    renderApp('/videos/video-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Save to playlist' }));
    return screen.findByRole('dialog', { name: 'Save to playlist' });
  }

  it('adds the video to a chosen playlist', async () => {
    let added;
    server.use(
      http.post('/api/playlists/playlist-1/videos', async ({ request }) => {
        added = await request.json();
        return HttpResponse.json({ data: makePlaylist() });
      }),
    );
    const dialog = await openDialog();

    await userEvent.click(
      await within(dialog).findByRole('button', { name: 'Add to Frontend course' }),
    );

    expect(await screen.findByText('Added to “Frontend course”.')).toBeVisible();
    expect(added).toEqual({ videoId: 'video-1' });
  });

  it('says when the video is already in that playlist', async () => {
    server.use(
      http.post('/api/playlists/playlist-1/videos', () =>
        apiError(409, 'CONFLICT', 'Video is already in this playlist'),
      ),
    );
    const dialog = await openDialog();

    await userEvent.click(
      await within(dialog).findByRole('button', { name: 'Add to Frontend course' }),
    );

    expect(
      await screen.findByText('“React Hooks in Depth” is already in “Frontend course”.'),
    ).toBeVisible();
  });

  it('creates a new private playlist and adds the video to it', async () => {
    let created;
    server.use(
      http.post('/api/playlists', async ({ request }) => {
        created = await request.json();
        return HttpResponse.json(
          { data: makePlaylist({ id: 'p-new', title: created.title }) },
          { status: 201 },
        );
      }),
      http.post('/api/playlists/p-new/videos', () => HttpResponse.json({ data: makePlaylist() })),
    );
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByLabelText('Or create a new playlist'), 'Revision');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and add' }));

    expect(await screen.findByText('Added to “Revision”.')).toBeVisible();
    expect(created).toEqual({ title: 'Revision', visibility: 'private' });
  });
});
