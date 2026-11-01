import Alert from 'react-bootstrap/Alert';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { VideoStatusBadge, VisibilityBadge } from '../../components/ui/VideoStatusBadge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatDuration, formatRelativeDate, pluralize } from '../../lib/format.js';
import { useAuth } from '../auth/authContext.js';
import { SaveToPlaylistButton } from '../playlists/SaveToPlaylistButton.jsx';
import { resumePosition } from './playback.js';
import { UpNext } from './UpNext.jsx';
import { VideoActions } from './VideoActions.jsx';
import { VideoPlayer } from './VideoPlayer.jsx';
import { getVideoDetails, recordView, saveProgress } from './watchApi.js';

function VideoDetails({ video }) {
  const { isAuthenticated } = useAuth();
  useDocumentTitle(video.title);

  const isPlayable = video.status === 'ready' && video.renditions.length > 0;
  const resumeAt = resumePosition(video.viewer?.progressSeconds, video.durationSeconds);

  return (
    <Row className="g-4">
      <Col lg={8} className="d-grid gap-3 align-content-start">
        {isPlayable ? (
          <VideoPlayer
            key={video.id}
            video={video}
            startAt={resumeAt}
            // Counting views and saving progress are best-effort: never interrupt playback.
            onPlaybackStart={() => recordView(video.id).catch(() => {})}
            onPositionSave={
              isAuthenticated
                ? (seconds) => saveProgress(video.id, seconds).catch(() => {})
                : undefined
            }
          />
        ) : (
          <Alert variant={video.status === 'failed' ? 'danger' : 'warning'} className="mb-0">
            {video.status === 'failed'
              ? 'This video could not be processed, so it cannot be played.'
              : 'This video is still being processed. Check back in a moment.'}
          </Alert>
        )}

        {resumeAt > 0 && isPlayable && (
          <p className="small text-body-secondary mb-0">
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
            Continuing from {formatDuration(resumeAt)}, where you left off.
          </p>
        )}

        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap gap-2">
            <VideoStatusBadge status={video.status} />
            {video.visibility === 'private' && <VisibilityBadge visibility="private" />}
          </div>
          <h1 className="h4 mb-0">{video.title}</h1>
          <div className="small text-body-secondary">
            {pluralize(video.viewCount, 'view')} · {formatRelativeDate(video.createdAt)}
            {video.category && (
              <>
                {' · '}
                <Link to={`/?category=${video.category.slug}`}>{video.category.name}</Link>
              </>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <VideoActions video={video} />
          <SaveToPlaylistButton video={video} />
        </div>

        {video.description && (
          <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
            {video.description}
          </p>
        )}

        {video.tags.length > 0 && (
          <div className="d-flex flex-wrap gap-2" aria-label="Tags">
            {video.tags.map((tag) => (
              <Link
                key={tag}
                to={`/?tag=${encodeURIComponent(tag)}`}
                className="btn btn-sm btn-outline-secondary rounded-pill"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </Col>
      <Col lg={4}>
        <UpNext video={video} />
      </Col>
    </Row>
  );
}

function WatchContent({ videoId }) {
  const video = useApi((signal) => getVideoDetails(videoId, signal), [videoId]);

  if (video.error?.status === 404) {
    return (
      <EmptyState
        icon="film"
        title="Video not found"
        message="It may have been removed, or the link is wrong."
        action={
          <Link to="/" className="btn btn-primary">
            Back to the library
          </Link>
        }
      />
    );
  }
  if (video.error && !video.data) {
    return <ErrorState message="This video could not be loaded." onRetry={video.reload} />;
  }
  if (!video.data || video.isLoading) return <LoadingSpinner label="Loading video…" />;

  return <VideoDetails video={video.data} />;
}

export function WatchPage() {
  const { id } = useParams();
  const { status } = useAuth();

  // Wait for the saved session so a signed-in viewer's resume position is known
  // before the player starts.
  if (status === 'loading') return <LoadingSpinner label="Loading video…" />;

  return <WatchContent key={id} videoId={id} />;
}
