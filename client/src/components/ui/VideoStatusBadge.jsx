import Badge from 'react-bootstrap/Badge';
import { VIDEO_STATUSES } from '../../lib/videoStatus.js';

/**
 * Status pill for a video. "Ready" is the normal state, so it is only shown
 * when `showReady` is set (e.g. in the admin table, where every row has a status).
 */
export function VideoStatusBadge({ status, showReady = false }) {
  const config = VIDEO_STATUSES[status];
  if (!config || (status === 'ready' && !showReady)) return null;

  return (
    <Badge bg={config.variant} text={config.variant === 'warning' ? 'dark' : undefined}>
      {status === 'processing' && (
        <span
          className="spinner-border spinner-border-sm me-1"
          style={{ width: '0.6rem', height: '0.6rem' }}
          aria-hidden="true"
        />
      )}
      {config.label}
    </Badge>
  );
}

/** Public / Private pill. */
export function VisibilityBadge({ visibility }) {
  return visibility === 'private' ? (
    <Badge bg="dark">
      <i className="bi bi-lock-fill me-1" aria-hidden="true" />
      Private
    </Badge>
  ) : (
    <Badge bg="secondary" className="bg-opacity-25 text-body">
      <i className="bi bi-globe2 me-1" aria-hidden="true" />
      Public
    </Badge>
  );
}
