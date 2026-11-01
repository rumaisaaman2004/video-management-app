import Button from 'react-bootstrap/Button';
import { AppPagination } from '../../components/ui/AppPagination.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { VideoGrid } from '../../components/ui/VideoGrid.jsx';
import { useApi } from '../../hooks/useApi.js';
import { pluralize } from '../../lib/format.js';
import { useAuth } from '../auth/authContext.js';
import { ContinueWatching } from '../me/ContinueWatching.jsx';
import { LibraryFilters } from './LibraryFilters.jsx';
import { listCategories, listLibraryVideos, listTags } from './libraryApi.js';
import { useLibraryParams } from './useLibraryParams.js';

/** One line describing the results, announced to screen readers when it changes. */
function resultSummary(meta, params) {
  if (!meta) return '';
  const count = pluralize(meta.total, 'video');
  return params.q ? `${count} for “${params.q}”` : count;
}

export function LibraryPage() {
  const { isAuthenticated } = useAuth();
  const { params, sortOptions, hasFilters, update, clearFilters } = useLibraryParams();
  const { q, category, tag, sort, page } = params;

  const videos = useApi(
    (signal) => listLibraryVideos({ q, category, tag, sort, page }, signal),
    [q, category, tag, sort, page],
  );
  // Filter menus are a convenience: if they fail to load, the library still works.
  const categories = useApi(listCategories, []);
  const tags = useApi(listTags, []);

  const result = videos.data;

  function goToPage(nextPage) {
    update({ page: nextPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderResults() {
    if (videos.error && !result) {
      return <ErrorState message="The library could not be loaded." onRetry={videos.reload} />;
    }
    if (!result) return <VideoGrid isLoading />;

    if (result.meta.total === 0) {
      return hasFilters ? (
        <EmptyState
          icon="search"
          title="No videos match your filters"
          message="Try other words, or remove a filter."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <EmptyState
          icon="collection-play"
          title="No videos yet"
          message="Videos appear here once they have been uploaded and processed."
        />
      );
    }

    return (
      <>
        {videos.error && (
          <ErrorState message="The latest results could not be loaded." onRetry={videos.reload} />
        )}
        {/* Keep the current results visible, faded, while the next ones load. */}
        <div
          style={{ opacity: videos.isLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}
          aria-busy={videos.isLoading}
        >
          <VideoGrid videos={result.data} />
        </div>
        <AppPagination page={page} totalPages={result.meta.totalPages} onPageChange={goToPage} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Video library" subtitle="Browse and watch educational videos." />
      {/* Only on the plain first page, so it never pushes search results down. */}
      {isAuthenticated && !hasFilters && page === 1 && <ContinueWatching />}
      <LibraryFilters
        params={params}
        sortOptions={sortOptions}
        categories={categories.data ?? []}
        tags={tags.data ?? []}
        onChange={update}
      />
      {/* Card titles are h3; this keeps the heading outline complete for screen readers. */}
      <h2 className="visually-hidden">Videos</h2>
      <p className="small text-body-secondary mb-3" aria-live="polite">
        {resultSummary(result?.meta, params)}
      </p>
      {renderResults()}
    </>
  );
}
