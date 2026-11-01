import { Link } from 'react-router';
import { useApi } from '../../hooks/useApi.js';
import { formatDuration, pluralize } from '../../lib/format.js';
import { listLibraryVideos } from '../videos/libraryApi.js';

const MAX_SUGGESTIONS = 6;

/** Other videos to watch next: the most viewed in the same category (or overall). */
export function UpNext({ video }) {
  const category = video.category?.slug ?? '';
  const suggestions = useApi(
    (signal) => listLibraryVideos({ category, sort: 'popular', page: 1 }, signal),
    [category],
  );

  const items = (suggestions.data?.data ?? [])
    .filter((suggestion) => suggestion.id !== video.id)
    .slice(0, MAX_SUGGESTIONS);

  // Suggestions are optional; show nothing rather than an error or an empty box.
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="up-next-heading">
      <h2 id="up-next-heading" className="h6 text-body-secondary text-uppercase mb-3">
        {video.category ? `More in ${video.category.name}` : 'Up next'}
      </h2>
      <ul className="list-unstyled d-grid gap-3 mb-0">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/videos/${item.id}`} className="d-flex gap-3 text-reset">
              <div className="position-relative flex-shrink-0" style={{ width: '9rem' }}>
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="rounded w-100"
                    style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="rounded bg-body-tertiary w-100"
                    style={{ aspectRatio: '16 / 9' }}
                  />
                )}
                <span className="position-absolute bottom-0 end-0 m-1 badge bg-dark bg-opacity-75">
                  {formatDuration(item.durationSeconds)}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="fw-semibold small">{item.title}</div>
                <div className="small text-body-secondary">{pluralize(item.viewCount, 'view')}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
