import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import { Link } from 'react-router';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { useVideoProcessingStatus } from './useVideoProcessingStatus.js';

/** Shown after an upload: follows processing until the video is ready (or failed). */
export function UploadResult({ videoId, onUploadAnother }) {
  const { video, error } = useVideoProcessingStatus(videoId);

  if (error && !video) {
    return <ErrorState message="The upload worked, but its status could not be loaded." />;
  }

  const status = video?.status ?? 'processing';

  return (
    <Card style={{ maxWidth: '40rem' }}>
      <Card.Body className="d-grid gap-3">
        <div aria-live="polite">
          {status === 'processing' && (
            <div className="d-flex align-items-center gap-3">
              <Spinner animation="border" variant="primary" aria-hidden="true" />
              <div>
                <h2 className="h5 mb-1">Processing your video…</h2>
                <p className="mb-0 text-body-secondary">
                  Creating the thumbnail and quality versions. You can leave this page; processing
                  continues on the server.
                </p>
              </div>
            </div>
          )}
          {status === 'ready' && (
            <Alert variant="success" className="mb-0">
              <h2 className="h5 alert-heading">Your video is ready</h2>
              <p className="mb-0">
                <strong>{video.title}</strong> has been processed
                {video.visibility === 'public'
                  ? ' and is now in the library.'
                  : '. It is private, so only admins can see it.'}
              </p>
            </Alert>
          )}
          {status === 'failed' && (
            <Alert variant="danger" className="mb-0">
              <h2 className="h5 alert-heading">This video could not be processed</h2>
              <p className="mb-0">
                The file may be damaged or use an unsupported format. Try exporting it again as MP4
                and uploading the new file.
              </p>
            </Alert>
          )}
        </div>

        {video?.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={`Thumbnail for ${video.title}`}
            className="rounded"
            style={{ maxWidth: '20rem' }}
          />
        )}

        <div className="d-flex flex-wrap gap-2">
          <Link to={`/admin/videos/${videoId}/edit`} className="btn btn-outline-primary">
            Edit details
          </Link>
          <Button variant="primary" onClick={onUploadAnother}>
            Upload another video
          </Button>
          <Link to="/admin/videos" className="btn btn-link">
            Back to all videos
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}
