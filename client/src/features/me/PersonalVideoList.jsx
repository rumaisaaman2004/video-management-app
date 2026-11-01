import { AppPagination } from '../../components/ui/AppPagination.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { VideoGrid } from '../../components/ui/VideoGrid.jsx';

/**
 * A page of the user's own videos (favourites, history) with paging and a
 * per-card action. `videos` is a useApi result holding `{ data, meta }`;
 * `heading` names the list for screen readers.
 */
export function PersonalVideoList({
  videos,
  page,
  onPageChange,
  renderActions,
  emptyState,
  heading,
}) {
  if (videos.error && !videos.data) {
    return <ErrorState message="Your videos could not be loaded." onRetry={videos.reload} />;
  }
  if (!videos.data) return <VideoGrid isLoading />;
  if (videos.data.meta.total === 0) return emptyState;

  return (
    <>
      {/* Card titles are h3; this section heading keeps the outline complete. */}
      <h2 className="visually-hidden">{heading}</h2>
      <div style={{ opacity: videos.isLoading ? 0.6 : 1 }} aria-busy={videos.isLoading}>
        <VideoGrid videos={videos.data.data} renderActions={renderActions} />
      </div>
      <AppPagination
        page={page}
        totalPages={videos.data.meta.totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
}
