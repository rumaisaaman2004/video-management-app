import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../test/render.jsx';
import { apiError, makeVideo, pageOf, server } from '../../test/server.js';

const categories = [
  { id: 'c1', name: 'Web Development', slug: 'web-development', videoCount: 3 },
  { id: 'c2', name: 'Design', slug: 'design', videoCount: 1 },
];
const tags = [
  { name: 'react', videoCount: 2 },
  { name: 'css', videoCount: 1 },
  { name: 'unused', videoCount: 0 },
];

/** Serves the library and records the query of every /api/videos request. */
function useLibraryApi(respond = () => pageOf([makeVideo()])) {
  const requests = [];
  server.use(
    http.get('/api/videos', ({ request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      requests.push(query);
      return respond(query);
    }),
    http.get('/api/categories', () => HttpResponse.json({ data: categories })),
    http.get('/api/tags', () => HttpResponse.json({ data: tags })),
  );
  return requests;
}

const currentQuery = (router) => router.state.location.search;

describe('library page', () => {
  it('shows ready, public videos as cards with a result count', async () => {
    const requests = useLibraryApi(() =>
      pageOf([makeVideo(), makeVideo({ id: 'video-2', title: 'CSS Grid' })]),
    );
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'React Hooks in Depth' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'CSS Grid' })).toBeVisible();
    expect(screen.getByText('2 videos')).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ status: 'ready', visibility: 'public', pageSize: '12' });
  });

  it('restores search, filters, sort and page from the URL', async () => {
    const requests = useLibraryApi();
    renderApp('/?q=hooks&category=design&tag=css&sort=popular&page=2');

    await screen.findByRole('link', { name: 'React Hooks in Depth' });

    expect(requests[0]).toMatchObject({
      q: 'hooks',
      category: 'design',
      tag: 'css',
      sort: 'popular',
      page: '2',
    });
    expect(screen.getByRole('searchbox', { name: 'Search videos' })).toHaveValue('hooks');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('design');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('popular');
    expect(screen.getByRole('button', { name: '#css' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches once typing pauses and offers "Best match" sorting', async () => {
    const requests = useLibraryApi();
    const { router } = renderApp('/');
    await screen.findByRole('link', { name: 'React Hooks in Depth' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search videos' }), 'react hooks');

    await waitFor(() => expect(currentQuery(router)).toBe('?q=react+hooks'));
    await waitFor(() =>
      expect(requests.at(-1)).toMatchObject({ q: 'react hooks', sort: 'relevance' }),
    );
    // One request for the finished words, not one per keystroke.
    expect(requests.filter((query) => query.q)).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveDisplayValue('Best match');
  });

  it('returns to the first page when a filter changes', async () => {
    useLibraryApi();
    const { router } = renderApp('/?page=3');
    await screen.findByRole('link', { name: 'React Hooks in Depth' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'design');

    expect(currentQuery(router)).toBe('?category=design');
  });

  it('offers popular tags as toggles, hiding unused ones', async () => {
    useLibraryApi();
    const { router } = renderApp('/');
    const reactTag = await screen.findByRole('button', { name: '#react' });

    expect(screen.queryByRole('button', { name: '#unused' })).not.toBeInTheDocument();

    await userEvent.click(reactTag);
    expect(currentQuery(router)).toBe('?tag=react');
    expect(screen.getByRole('button', { name: '#react' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: '#react' }));
    expect(currentQuery(router)).toBe('');
  });

  it('pages through results', async () => {
    const requests = useLibraryApi((query) =>
      pageOf([makeVideo({ title: `Page ${query.page ?? 1} video` })], {
        page: Number(query.page ?? 1),
        total: 30,
      }),
    );
    const { router } = renderApp('/');
    await screen.findByRole('link', { name: 'Page 1 video' });

    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(await screen.findByRole('link', { name: 'Page 2 video' })).toBeVisible();
    expect(currentQuery(router)).toBe('?page=2');
    expect(requests.at(-1).page).toBe('2');
  });

  it('explains empty results and clears all filters', async () => {
    useLibraryApi((query) => (query.q ? pageOf([]) : pageOf([makeVideo()])));
    const { router } = renderApp('/?q=nothing&tag=css');

    await userEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('link', { name: 'React Hooks in Depth' })).toBeVisible();
    expect(currentQuery(router)).toBe('');
    expect(screen.getByRole('searchbox', { name: 'Search videos' })).toHaveValue('');
  });

  it('says so when the library has no videos at all', async () => {
    useLibraryApi(() => pageOf([]));
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'No videos yet' })).toBeVisible();
  });

  it('shows an error with a working retry', async () => {
    let attempts = 0;
    useLibraryApi(() => {
      attempts += 1;
      return attempts === 1
        ? apiError(500, 'INTERNAL_ERROR', 'Something went wrong')
        : pageOf([makeVideo()]);
    });
    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'React Hooks in Depth' })).toBeVisible();
  });

  it('restores the previous search with the Back button', async () => {
    useLibraryApi();
    const { router } = renderApp('/?q=react');
    await screen.findByRole('link', { name: 'React Hooks in Depth' });

    await userEvent.click(screen.getByRole('button', { name: '#css' }));
    expect(currentQuery(router)).toBe('?q=react&tag=css');

    await act(() => router.navigate(-1));

    expect(currentQuery(router)).toBe('?q=react');
    expect(screen.getByRole('button', { name: '#css' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('searchbox', { name: 'Search videos' })).toHaveValue('react');
  });
});
