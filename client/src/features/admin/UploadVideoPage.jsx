import { useEffect, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { Link } from 'react-router';
import { FormField } from '../../components/ui/FormField.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useApi } from '../../hooks/useApi.js';
import { fieldErrorsFromApiError } from '../../lib/formErrors.js';
import { listCategories } from '../videos/libraryApi.js';
import { uploadVideo } from './adminVideosApi.js';
import { UploadResult } from './UploadResult.jsx';
import { EMPTY_VIDEO_DETAILS, toUploadFormData, validateVideoDetails } from './videoDetails.js';
import { VideoDetailsFields } from './VideoDetailsFields.jsx';
import {
  formatFileSize,
  MAX_UPLOAD_SIZE_MB,
  titleFromFileName,
  validateVideoFile,
  VIDEO_ACCEPT,
} from './videoFile.js';

/** Asks the browser to confirm before closing the tab while `isActive`. */
function useWarnBeforeLeaving(isActive) {
  useEffect(() => {
    if (!isActive) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isActive]);
}

export function UploadVideoPage() {
  const showToast = useToast();
  const categories = useApi(listCategories, []);

  const [file, setFile] = useState(null);
  const [values, setValues] = useState(EMPTY_VIDEO_DETAILS);
  const [clientErrors, setClientErrors] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const [progress, setProgress] = useState(null); // 0–1 while uploading
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const abortRef = useRef(null);

  const isUploading = progress !== null;
  useWarnBeforeLeaving(isUploading);

  const serverFieldErrors = fieldErrorsFromApiError(uploadError);
  const errors = { ...serverFieldErrors, ...clientErrors };
  const formError =
    uploadError && Object.keys(serverFieldErrors).length === 0 ? uploadError.message : null;

  function clearError(name) {
    setClientErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  function handleFileChange(event) {
    const chosen = event.target.files[0] ?? null;
    setFile(chosen);
    clearError('file');
    if (chosen && !values.title.trim()) {
      setValues((current) => ({ ...current, title: titleFromFileName(chosen.name) }));
    }
  }

  function handleDetailsChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    clearError(name);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const fileError = validateVideoFile(file);
    const nextErrors = { ...validateVideoDetails(values), ...(fileError && { file: fileError }) };
    setClientErrors(nextErrors);
    setUploadError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    try {
      const video = await uploadVideo(toUploadFormData(values, file), {
        onProgress: setProgress,
        signal: controller.signal,
      });
      setUploadedVideoId(video.id);
      showToast({ message: 'Upload complete. Processing has started.' });
    } catch (err) {
      if (err.name === 'AbortError') showToast({ variant: 'info', message: 'Upload cancelled.' });
      else setUploadError(err);
    } finally {
      setProgress(null);
    }
  }

  function startOver() {
    setFile(null);
    setValues(EMPTY_VIDEO_DETAILS);
    setUploadedVideoId(null);
  }

  return (
    <>
      <PageHeader
        title="Upload a video"
        subtitle="It is processed on the server into a thumbnail and quality versions."
        actions={
          <Link to="/admin/videos" className="btn btn-outline-secondary">
            Back to all videos
          </Link>
        }
      />

      {uploadedVideoId ? (
        <UploadResult videoId={uploadedVideoId} onUploadAnother={startOver} />
      ) : (
        <Card style={{ maxWidth: '48rem' }}>
          <Card.Body>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form noValidate onSubmit={handleSubmit}>
              <FormField
                label="Video file"
                name="file"
                type="file"
                accept={VIDEO_ACCEPT}
                required
                disabled={isUploading}
                help={`MP4, MOV, WebM or MKV, up to ${MAX_UPLOAD_SIZE_MB} MB.${
                  file ? ` Selected: ${file.name} (${formatFileSize(file.size)}).` : ''
                }`}
                onChange={handleFileChange}
                error={errors.file}
              />
              <VideoDetailsFields
                values={values}
                errors={errors}
                categories={categories.data ?? []}
                onChange={handleDetailsChange}
                disabled={isUploading}
              />

              {isUploading ? (
                <div className="d-grid gap-2">
                  <ProgressBar
                    now={Math.round(progress * 100)}
                    label={`${Math.round(progress * 100)}%`}
                    animated
                    aria-label="Upload progress"
                  />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-body-secondary">
                      Uploading… keep this page open until it finishes.
                    </span>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => abortRef.current.abort()}
                    >
                      Cancel upload
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="submit">
                  <i className="bi bi-cloud-arrow-up me-2" aria-hidden="true" />
                  Upload video
                </Button>
              )}
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  );
}
