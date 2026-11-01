import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render.jsx';
import { apiError, makeUser, makeVideo, pageOf, server } from '../../test/server.js';

// jsdom cannot play video, so the page is tested with a stand-in player that exposes
// the same callbacks; the real Video.js player is checked in a browser.
vi.mock('./VideoPlayer.jsx', () => ({
  VideoPlayer: ({ video, startAt, onPlaybackStart, onPositionSave }) => (
    <div data-testid="player" data-start-at={startAt} data-qualities={video.renditions.length}>
      <button type="button" onClick={onPlaybackStart}>
        Start playback
      </button>
      {onPositionSave && (
        <button type="button" onClick={() => onPositionSave(42.4)}>
          Report position
        </button>
      )}
    </div>
  ),
}));

const renditions = [
  { label: '360p', width: 640, height: 360, url: '/api/videos/video-1/renditions/360p' },
  { label: '720p', width: 1280, height: 720, url: '/api/videos/video-1/renditions/720p' },
];

function serveVideo(overrides = {}) {
  server.use(
    http.get('/api/videos/video-1', () =>
      HttpResponse.json({
        data: makeVideo({
          description: 'useState and useEffect explained.',
          tags: ['react', 'hooks'],
          durationSeconds: 300,
          renditions,
          ...overrides,
        }),
      }),
    ),
  );
}

function signIn() {
  server.use(
    http.post('/api/auth/refresh', () =>
      HttpResponse.json({ data: { user: makeUser(), accessToken: 'token-1' } }),
    ),
  );
}

/** Records every request to `path` (method + JSON body). */
function recordRequests(method, path, respond = () => new HttpResponse(null, { status: 204 })) {
  const calls = [];
  server.use(
    http[method](path, async ({ request }) => {
      calls.push(await request.json().catch(() => null));
      return respond();
    }),
  );
  return calls;
}

describe('watch page', () => {
  // The route loads this page lazily. Load it once up front so every test measures the
  // page's behaviour, not how long the first import takes on a busy machine.
  beforeAll(() => import('./WatchPage.jsx'));

  it('shows the video with its details, category and tags', async () => {
    serveVideo();
    renderApp('/videos/video-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'React Hooks in Depth' }),
    ).toBeVisible();
    expect(screen.getByTestId('player')).toHaveAttribute('data-qualities', '2');
    expect(screen.getByText('useState and useEffect explained.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Web Development' })).toHaveAttribute(
      'href',
      '/?category=web-development',
    );
    expect(screen.getByRole('link', { name: '#hooks' })).toHaveAttribute('href', '/?tag=hooks');
    // The tab title is set by an effect just after render, so wait for it.
    await waitFor(() => expect(document.title).toBe('React Hooks in Depth · Video Library'));
  });

  it('counts a view when playback starts', async () => {
    serveVideo();
    const views = recordRequests('post', '/api/videos/video-1/views');
    renderApp('/videos/video-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Start playback' }));

    await waitFor(() => expect(views).toHaveLength(1));
  });

  it('resumes and saves progress for signed-in viewers', async () => {
    signIn();
    serveVideo({
      viewer: { liked: false, bookmarked: false, progressSeconds: 125, completed: false },
    });
    const progress = recordRequests('put', '/api/videos/video-1/progress', () =>
      HttpResponse.json({ data: { progressSeconds: 42, completed: false } }),
    );
    renderApp('/videos/video-1');

    expect(await screen.findByTestId('player')).toHaveAttribute('data-start-at', '125');
    expect(screen.getByText('Continuing from 2:05, where you left off.')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Report position' }));
    await waitFor(() => expect(progress).toEqual([{ positionSeconds: 42.4 }]));
  });

  it('does not save progress for signed-out visitors', async () => {
    serveVideo();
    renderApp('/videos/video-1');

    await screen.findByTestId('player');
    expect(screen.queryByRole('button', { name: 'Report position' })).not.toBeInTheDocument();
  });

  it('likes immediately and keeps the count from the server', async () => {
    signIn();
    serveVideo({ likeCount: 3 });
    server.use(
      http.put('/api/videos/video-1/like', () =>
        HttpResponse.json({ data: { liked: true, likeCount: 5 } }),
      ),
    );
    renderApp('/videos/video-1');

    const like = await screen.findByRole('button', { name: /Like 3/ });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(like);

    const liked = await screen.findByRole('button', { name: /Like 5/ });
    expect(liked).toHaveAttribute('aria-pressed', 'true');
  });

  it('undoes a like the server refuses, with a message', async () => {
    signIn();
    serveVideo({ likeCount: 3 });
    server.use(
      http.put('/api/videos/video-1/like', () =>
        apiError(500, 'INTERNAL_ERROR', 'Something went wrong'),
      ),
    );
    renderApp('/videos/video-1');

    await userEvent.click(await screen.findByRole('button', { name: /Like 3/ }));

    expect(await screen.findByText('Your like could not be saved. Try again.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Like 3/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('saves to favourites', async () => {
    signIn();
    serveVideo();
    server.use(
      http.put('/api/videos/video-1/bookmark', () =>
        HttpResponse.json({ data: { bookmarked: true } }),
      ),
    );
    renderApp('/videos/video-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved to your favourites.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('asks signed-out visitors to sign in before liking', async () => {
    serveVideo();
    const { router } = renderApp('/videos/video-1');

    await userEvent.click(await screen.findByRole('button', { name: /Like/ }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(router.state.location.state.from.pathname).toBe('/videos/video-1');
  });

  it('suggests other videos from the same category', async () => {
    serveVideo();
    let suggestionQuery;
    server.use(
      http.get('/api/videos', ({ request }) => {
        suggestionQuery = Object.fromEntries(new URL(request.url).searchParams);
        return pageOf([makeVideo(), makeVideo({ id: 'video-2', title: 'useEffect Patterns' })]);
      }),
    );
    renderApp('/videos/video-1');

    expect(await screen.findByRole('heading', { name: 'More in Web Development' })).toBeVisible();
    expect(screen.getByRole('link', { name: /useEffect Patterns/ })).toHaveAttribute(
      'href',
      '/videos/video-2',
    );
    // The video being watched is not suggested to itself.
    expect(screen.queryByRole('link', { name: /React Hooks in Depth/ })).not.toBeInTheDocument();
    expect(suggestionQuery).toMatchObject({ category: 'web-development', sort: 'popular' });
  });

  it('explains when a video is still processing (admins only see these)', async () => {
    serveVideo({ status: 'processing', renditions: [] });
    renderApp('/videos/video-1');

    expect(
      await screen.findByText('This video is still being processed. Check back in a moment.'),
    ).toBeVisible();
    expect(screen.queryByTestId('player')).not.toBeInTheDocument();
  });

  it('says when a video does not exist', async () => {
    server.use(
      http.get('/api/videos/missing', () => apiError(404, 'NOT_FOUND', 'Video not found')),
    );
    renderApp('/videos/missing');

    expect(await screen.findByRole('heading', { name: 'Video not found' })).toBeVisible();
  });
});
