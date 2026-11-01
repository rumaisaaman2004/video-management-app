import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { VideoStatusBadge, VisibilityBadge } from '../../components/ui/VideoStatusBadge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { fieldErrorsFromApiError } from '../../lib/formErrors.js';
import { listCategories } from '../videos/libraryApi.js';
import { getVideo, updateVideo } from './adminVideosApi.js';
import { DeleteVideoPanel } from './DeleteVideoPanel.jsx';
import { ThumbnailEditor } from './ThumbnailEditor.jsx';
import { toUpdatePayload, validateVideoDetails, videoDetailsFrom } from './videoDetails.js';
import { VideoDetailsFields } from './VideoDetailsFields.jsx';

function EditDetailsForm({ video, categories, onSaved }) {
  const showToast = useToast();
  const [values, setValues] = useState(() => videoDetailsFrom(video));
  const [clientErrors, setClientErrors] = useState({});
  const saving = useAsyncAction((payload) => updateVideo(video.id, payload));

  const serverFieldErrors = fieldErrorsFromApiError(saving.error);
  const errors = { ...serverFieldErrors, ...clientErrors };
  const formError =
    saving.error && Object.keys(serverFieldErrors).length === 0 ? saving.error.message : null;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setClientErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateVideoDetails(values);
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (await saving.run(toUpdatePayload(values))) {
      showToast({ message: 'Changes saved.' });
      onSaved();
    }
  }

  return (
    <Card>
      <Card.Body>
        <h2 className="h5">Details</h2>
        {formError && <Alert variant="danger">{formError}</Alert>}
        <Form noValidate onSubmit={handleSubmit}>
          <VideoDetailsFields
            values={values}
            errors={errors}
            categories={categories}
            onChange={handleChange}
            disabled={saving.isRunning}
          />
          <Button type="submit" disabled={saving.isRunning}>
            {saving.isRunning && (
              <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
            )}
            Save changes
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export function EditVideoPage() {
  const { id } = useParams();
  const video = useApi((signal) => getVideo(id, signal), [id]);
  const categories = useApi(listCategories, []);

  if (video.error?.status === 404) {
    return (
      <EmptyState
        icon="film"
        title="Video not found"
        message="It may have been deleted."
        action={
          <Link to="/admin/videos" className="btn btn-primary">
            Back to all videos
          </Link>
        }
      />
    );
  }
  if (video.error && !video.data) {
    return <ErrorState message="The video could not be loaded." onRetry={video.reload} />;
  }
  if (!video.data) return <LoadingSpinner label="Loading video…" />;

  const current = video.data;

  return (
    <>
      <PageHeader
        title="Edit video"
        subtitle={
          <span className="d-inline-flex flex-wrap align-items-center gap-2">
            {current.title}
            <VideoStatusBadge status={current.status} showReady />
            <VisibilityBadge visibility={current.visibility} />
          </span>
        }
        actions={
          <Link to="/admin/videos" className="btn btn-outline-secondary">
            Back to all videos
          </Link>
        }
      />
      <Row className="g-4">
        <Col lg={7}>
          {/* Re-created after each save, so the form shows exactly what was stored. */}
          <EditDetailsForm
            key={current.updatedAt}
            video={current}
            categories={categories.data ?? []}
            onSaved={video.reload}
          />
        </Col>
        <Col lg={5} className="d-grid gap-4 align-content-start">
          <ThumbnailEditor video={current} onChanged={video.reload} />
          <DeleteVideoPanel video={current} />
        </Col>
      </Row>
    </>
  );
}
