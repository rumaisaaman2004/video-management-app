import Button from 'react-bootstrap/Button';
import { Link } from 'react-router';
import { formatDuration } from '../../lib/format.js';

/**
 * The videos of a playlist in order. When `canEdit`, each row has Move up,
 * Move down and Remove buttons (keyboard and screen-reader friendly, unlike drag-and-drop).
 */
export function PlaylistVideoList({ videos, canEdit, isBusy, onMove, onRemove }) {
  return (
    <ol className="list-unstyled d-grid gap-2 mb-0" aria-label="Videos in this playlist">
      {videos.map((video, index) => (
        <li key={video.id} className="d-flex align-items-center gap-3 p-2 rounded-3 border">
          <span
            className="text-body-secondary text-end font-monospace"
            style={{ width: '1.75rem' }}
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <Link
            to={`/videos/${video.id}`}
            className="flex-shrink-0"
            tabIndex={-1}
            aria-hidden="true"
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt=""
                width="112"
                height="63"
                className="rounded"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span
                className="d-block rounded bg-body-tertiary"
                style={{ width: 112, height: 63 }}
              />
            )}
          </Link>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <Link to={`/videos/${video.id}`} className="fw-semibold text-reset">
              {video.title}
            </Link>
            <div className="small text-body-secondary">
              {[video.category?.name, formatDuration(video.durationSeconds)]
                .filter(Boolean)
                .join(' · ')}
              {video.viewer?.completed && (
                <span className="text-success-emphasis ms-2">
                  <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />
                  Watched
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="d-flex gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={isBusy || index === 0}
                aria-label={`Move ${video.title} up`}
                onClick={() => onMove(index, -1)}
              >
                <i className="bi bi-arrow-up" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={isBusy || index === videos.length - 1}
                aria-label={`Move ${video.title} down`}
                onClick={() => onMove(index, 1)}
              >
                <i className="bi bi-arrow-down" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                disabled={isBusy}
                aria-label={`Remove ${video.title} from this playlist`}
                onClick={() => onRemove(video)}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
