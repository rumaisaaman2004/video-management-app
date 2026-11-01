import Card from 'react-bootstrap/Card';
import Placeholder from 'react-bootstrap/Placeholder';
import { Link } from 'react-router';
import { formatDuration, formatRelativeDate, pluralize } from '../../lib/format.js';
import { VIDEO_STATUSES } from '../../lib/videoStatus.js';
import styles from './VideoCard.module.scss';
import { VideoStatusBadge, VisibilityBadge } from './VideoStatusBadge.jsx';

function watchedPercent(video) {
  const progress = video.viewer?.progressSeconds ?? 0;
  if (!video.durationSeconds || progress <= 0) return 0;
  return Math.min(100, Math.round((progress / video.durationSeconds) * 100));
}

/**
 * The one card used for videos everywhere (library, favourites, history,
 * playlists). `actions` renders extra controls under the details.
 */
export function VideoCard({ video, actions }) {
  const href = `/videos/${video.id}`;
  const percent = watchedPercent(video);
  // "Ready" is the normal state, so only other statuses are called out.
  const statusLabel = video.status !== 'ready' ? VIDEO_STATUSES[video.status]?.label : null;

  return (
    <Card className="h-100 border-0 bg-transparent">
      {/* The title link below is the one keyboard/screen-reader users reach; this is a mouse shortcut. */}
      <Link to={href} className={styles.thumbnailLink} tabIndex={-1} aria-hidden="true">
        <div className={styles.thumbnail}>
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt="" loading="lazy" />
          ) : (
            <div className={styles.placeholder}>
              <i className="bi bi-play-circle" />
            </div>
          )}

          <div className={styles.badges}>
            <VideoStatusBadge status={video.status} />
            {video.visibility === 'private' && <VisibilityBadge visibility="private" />}
          </div>

          {video.durationSeconds != null && (
            <span className={styles.duration}>{formatDuration(video.durationSeconds)}</span>
          )}
          {percent > 0 && (
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      </Link>

      <Card.Body className="px-0 pt-2 pb-0 d-flex flex-column gap-1">
        <Card.Title as="h3" className={`h6 mb-0 ${styles.title}`}>
          <Link to={href} className="text-reset">
            {video.title}
          </Link>
        </Card.Title>

        <div className="small text-body-secondary">
          {[
            video.category?.name,
            pluralize(video.viewCount, 'view'),
            formatRelativeDate(video.createdAt),
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {/* The same information as the badges and progress bar, for screen readers. */}
        <span className="visually-hidden">
          {[
            statusLabel,
            video.visibility === 'private' && 'Private',
            video.durationSeconds != null && `Length ${formatDuration(video.durationSeconds)}`,
            percent > 0 && `${percent}% watched`,
          ]
            .filter(Boolean)
            .join(', ')}
        </span>

        {video.viewer?.completed && (
          <span className="small text-success-emphasis">
            <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />
            Watched
          </span>
        )}
        {actions}
      </Card.Body>
    </Card>
  );
}

/** Loading placeholder with the same shape as a VideoCard. */
export function VideoCardSkeleton() {
  return (
    <Card className="h-100 border-0 bg-transparent" aria-hidden="true">
      <div className={styles.thumbnail} />
      <Card.Body className="px-0 pt-2">
        <Placeholder as="div" animation="glow">
          <Placeholder xs={10} />
          <Placeholder xs={6} size="sm" />
        </Placeholder>
      </Card.Body>
    </Card>
  );
}
