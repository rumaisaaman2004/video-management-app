import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render.jsx';
import { apiError, makeUser, makeVideo, pageOf, server } from '../../test/server.js';

const categories = [
  { id: 'cat-1', name: 'Web Development', slug: 'web-development', videoCount: 1 },
];

function signInAs(role) {
  server.use(
    http.post('/api/auth/refresh', () =>
      HttpResponse.json({ data: { user: makeUser({ role }), accessToken: 'token-1' } }),
    ),
    http.get('/api/categories', () => HttpResponse.json({ data: categories })),
  );
}

/** Serves the admin video list and records each request's query. */
function useAdminList(respond) {
  const requests = [];
  server.use(
    http.get('/api/videos', ({ request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      requests.push(query);
      return respond(query);
    }),
  );
  return requests;
}

const videoFile = (name = 'react_hooks-intro.mp4') =>
  new File(['fake video bytes'], name, { type: 'video/mp4' });

describe('admin access', () => {
  it('shows the management link to admins only', async () => {
    signInAs('admin');
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Manage videos' })).toHaveAttribute(
      'href',
      '/admin/videos',
    );
  });

  it('tells non-admins the page is for admins', async () => {
    signInAs('user');
    renderApp('/admin/videos');

    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Manage videos' })).not.toBeInTheDocument();
  });
});

describe('video management table', () => {
  beforeEach(() => signInAs('admin'));

  it('lists every video with its status and visibility', async () => {
    const requests = useAdminList(() =>
      pageOf([
        makeVideo({ title: 'Ready video' }),
        makeVideo({ id: 'v2', title: 'Still processing', status: 'processing' }),
        makeVideo({ id: 'v3', title: 'Hidden', visibility: 'private', status: 'failed' }),
      ]),
    );
    renderApp('/admin/videos');

    const table = await screen.findByRole('table', { name: 'All videos' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText('Processing')).toBeVisible();
    expect(within(rows[2]).getByText('Failed')).toBeVisible();
    expect(within(rows[2]).getByText('Private')).toBeVisible();
    // The admin list must not be limited to ready, public videos.
    expect(requests[0]).toEqual({ sort: 'newest', page: '1', pageSize: '20' });
  });

  it('filters by status and sorts by clicking column headers', async () => {
    const requests = useAdminList(() => pageOf([makeVideo()]));
    const { router } = renderApp('/admin/videos');
    await screen.findByRole('table', { name: 'All videos' });

    expect(screen.getByRole('columnheader', { name: /Uploaded/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'processing');
    await userEvent.click(screen.getByRole('button', { name: /Views/ }));
    await waitFor(() =>
      expect(requests.at(-1)).toMatchObject({ status: 'processing', sort: 'least-viewed' }),
    );

    await userEvent.click(screen.getByRole('button', { name: /Views/ }));
    await waitFor(() => expect(requests.at(-1).sort).toBe('popular'));
    expect(router.state.location.search).toBe('?status=processing&sort=popular');
  });

  it('deletes a video after confirmation and refreshes the list', async () => {
    let deleted = false;
    const requests = useAdminList(() =>
      pageOf(deleted ? [] : [makeVideo({ title: 'Old lecture' })]),
    );
    server.use(
      http.delete('/api/videos/video-1', () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp('/admin/videos');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Old lecture' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this video?' });
    expect(dialog).toHaveTextContent('“Old lecture” and all its files will be permanently deleted');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete video' }));

    expect(await screen.findByText('“Old lecture” was deleted.')).toBeVisible();
    expect(await screen.findByText('No videos yet. Upload the first one.')).toBeVisible();
    expect(deleted).toBe(true);
    expect(requests).toHaveLength(2);
  });
});

describe('uploading a video', () => {
  beforeEach(() => signInAs('admin'));

  it('requires a supported file and suggests a title from its name', async () => {
    renderApp('/admin/videos/new');
    const uploadButton = await screen.findByRole('button', { name: 'Upload video' });

    await userEvent.click(uploadButton);
    expect(screen.getByLabelText(/Video file/)).toHaveAccessibleDescription(
      /Choose a video file to upload/,
    );

    await userEvent.upload(screen.getByLabelText(/Video file/), videoFile());
    expect(screen.getByLabelText(/^Title/)).toHaveValue('React hooks intro');
  });

  it('uploads, then follows processing until the video is ready', async () => {
    let sent;
    let statusChecks = 0;
    server.use(
      http.post('/api/videos', async ({ request }) => {
        const form = await request.formData();
        sent = {
          title: form.get('title'),
          tags: form.get('tags'),
          categoryId: form.get('categoryId'),
          visibility: form.get('visibility'),
          fileName: form.get('file').name,
          auth: request.headers.get('authorization'),
        };
        return HttpResponse.json(
          { data: makeVideo({ id: 'new-1', status: 'processing', thumbnailUrl: null }) },
          { status: 202 },
        );
      }),
      http.get('/api/videos/new-1', () => {
        statusChecks += 1;
        return HttpResponse.json({
          data: makeVideo({
            id: 'new-1',
            title: 'React hooks intro',
            status: statusChecks > 1 ? 'ready' : 'processing',
          }),
        });
      }),
    );
    renderApp('/admin/videos/new');

    await userEvent.upload(await screen.findByLabelText(/Video file/), videoFile());
    await userEvent.type(screen.getByLabelText('Tags'), 'React, hooks, react');
    await userEvent.click(screen.getByRole('button', { name: 'Upload video' }));

    expect(await screen.findByText('Processing your video…')).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'Your video is ready' }, { timeout: 4000 }),
    ).toBeVisible();
    expect(sent).toEqual({
      title: 'React hooks intro',
      tags: 'react,hooks',
      categoryId: null,
      visibility: 'public',
      fileName: 'react_hooks-intro.mp4',
      auth: 'Bearer token-1',
    });
  });

  it('shows the server’s file error on the file field', async () => {
    server.use(
      http.post('/api/videos', () =>
        apiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
          { field: 'body.file', message: 'File must be MP4, MOV, WebM or MKV' },
        ]),
      ),
    );
    renderApp('/admin/videos/new');

    await userEvent.upload(await screen.findByLabelText(/Video file/), videoFile());
    await userEvent.click(screen.getByRole('button', { name: 'Upload video' }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Video file/)).toHaveAccessibleDescription(
        /File must be MP4, MOV, WebM or MKV/,
      ),
    );
  });
});

describe('editing a video', () => {
  beforeEach(() => {
    signInAs('admin');
    server.use(
      http.get('/api/videos/video-1', () =>
        HttpResponse.json({
          data: makeVideo({ description: 'Intro', tags: ['react'], durationSeconds: 60 }),
        }),
      ),
    );
  });

  it('saves changed details as a clean update', async () => {
    let body;
    server.use(
      http.patch('/api/videos/video-1', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: makeVideo() });
      }),
    );
    renderApp('/admin/videos/video-1/edit');

    const title = await screen.findByLabelText(/^Title/);
    expect(title).toHaveValue('React Hooks in Depth');
    await userEvent.clear(title);
    await userEvent.type(title, 'Hooks, revised');
    await userEvent.type(screen.getByLabelText('Tags'), ', Hooks');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), '');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved.')).toBeVisible();
    expect(body).toEqual({
      title: 'Hooks, revised',
      description: 'Intro',
      categoryId: null,
      visibility: 'public',
      tags: ['react', 'hooks'],
    });
  });

  it('shows a server error for one tag on the tags field', async () => {
    server.use(
      http.patch('/api/videos/video-1', () =>
        apiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
          { field: 'body.tags.1', message: 'Tags may contain letters, numbers, spaces, + # . -' },
        ]),
      ),
    );
    renderApp('/admin/videos/video-1/edit');

    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Tags')).toHaveAccessibleDescription(
        /Tags may contain letters, numbers/,
      ),
    );
  });

  it('picks a thumbnail frame within the video length', async () => {
    let body;
    server.use(
      http.post('/api/videos/video-1/thumbnail/frame', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: makeVideo() });
      }),
    );
    renderApp('/admin/videos/video-1/edit');

    const seconds = await screen.findByLabelText('Or pick a frame (seconds)');
    await userEvent.clear(seconds);
    await userEvent.type(seconds, '90');
    await userEvent.click(screen.getByRole('button', { name: 'Use this frame' }));
    expect(seconds).toHaveAccessibleDescription(/Enter a time from 0 to 59 seconds/);

    await userEvent.clear(seconds);
    await userEvent.type(seconds, '12.5');
    await userEvent.click(screen.getByRole('button', { name: 'Use this frame' }));

    expect(await screen.findByText('Thumbnail set to the frame at 0:13.')).toBeVisible();
    expect(body).toEqual({ atSeconds: 12.5 });
  });

  it('deletes the video and returns to the list', async () => {
    useAdminList(() => pageOf([]));
    server.use(http.delete('/api/videos/video-1', () => new HttpResponse(null, { status: 204 })));
    const { router } = renderApp('/admin/videos/video-1/edit');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete this video' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete video' }),
    );

    expect(await screen.findByRole('heading', { name: 'Manage videos' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/admin/videos');
  });

  it('explains when the video no longer exists', async () => {
    server.use(http.get('/api/videos/gone', () => apiError(404, 'NOT_FOUND', 'Video not found')));
    renderApp('/admin/videos/gone/edit');

    expect(await screen.findByRole('heading', { name: 'Video not found' })).toBeVisible();
  });
});
