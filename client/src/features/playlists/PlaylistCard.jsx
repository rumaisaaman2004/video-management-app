import Card from 'react-bootstrap/Card';
import { Link } from 'react-router';
import { VisibilityBadge } from '../../components/ui/VideoStatusBadge.jsx';
import { pluralize } from '../../lib/format.js';

/** A playlist with its cover (the first video's thumbnail), size and visibility. */
export function PlaylistCard({ playlist }) {
  return (
    <Card className="h-100 border-0 bg-transparent">
      <Link
        to={`/playlists/${playlist.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="position-relative d-block rounded-3 overflow-hidden bg-body-tertiary"
        style={{ aspectRatio: '16 / 9' }}
      >
        {playlist.coverThumbnailUrl ? (
          <img
            src={playlist.coverThumbnailUrl}
            alt=""
            loading="lazy"
            className="w-100 h-100"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center fs-1 text-body-secondary">
            <i className="bi bi-collection-play" />
          </div>
        )}
        <span className="position-absolute bottom-0 end-0 m-2 badge bg-dark bg-opacity-75">
          <i className="bi bi-list-ul me-1" />
          {pluralize(playlist.videoCount, 'video')}
        </span>
      </Link>
      <Card.Body className="px-0 pt-2 pb-0 d-grid gap-1">
        <Card.Title as="h3" className="h6 mb-0">
          <Link to={`/playlists/${playlist.id}`} className="text-reset">
            {playlist.title}
          </Link>
        </Card.Title>
        <div className="d-flex align-items-center gap-2 small text-body-secondary">
          <VisibilityBadge visibility={playlist.visibility} />
          {pluralize(playlist.videoCount, 'video')}
        </div>
      </Card.Body>
    </Card>
  );
}
