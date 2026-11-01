import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import { FormField } from '../../components/ui/FormField.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { formatDuration } from '../../lib/format.js';
import { fieldErrorsFromApiError } from '../../lib/formErrors.js';
import { captureThumbnailFrame, replaceThumbnail } from './adminVideosApi.js';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** The message to show for a failed thumbnail change, preferring the field-specific one. */
function errorMessage(error, field) {
  if (!error) return null;
  return fieldErrorsFromApiError(error)[field] ?? error.message;
}

/** Shows the current thumbnail and replaces it with an uploaded image or a frame of the video. */
export function ThumbnailEditor({ video, onChanged }) {
  const showToast = useToast();
  const [image, setImage] = useState(null);
  const [seconds, setSeconds] = useState('0');
  const [frameError, setFrameError] = useState(null);

  const imageUpload = useAsyncAction(() => replaceThumbnail(video.id, image));
  const frameCapture = useAsyncAction((atSeconds) => captureThumbnailFrame(video.id, atSeconds));

  const isReady = video.status === 'ready';
  const duration = video.durationSeconds ?? 0;
  const isBusy = imageUpload.isRunning || frameCapture.isRunning;

  async function handleImageSubmit(event) {
    event.preventDefault();
    if (!image) return;
    if (await imageUpload.run()) {
      showToast({ message: 'Thumbnail updated.' });
      setImage(null);
      event.target.reset();
      onChanged();
    }
  }

  async function handleFrameSubmit(event) {
    event.preventDefault();
    const atSeconds = Number(seconds);
    if (seconds === '' || !Number.isFinite(atSeconds) || atSeconds < 0 || atSeconds >= duration) {
      setFrameError(`Enter a time from 0 to ${Math.max(0, duration - 1)} seconds`);
      return;
    }
    setFrameError(null);
    if (await frameCapture.run(atSeconds)) {
      showToast({ message: `Thumbnail set to the frame at ${formatDuration(atSeconds)}.` });
      onChanged();
    }
  }

  return (
    <Card>
      <Card.Body className="d-grid gap-3">
        <h2 className="h5 mb-0">Thumbnail</h2>
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={`Current thumbnail for ${video.title}`}
            className="rounded w-100"
            style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
          />
        ) : (
          <p className="text-body-secondary mb-0">No thumbnail yet.</p>
        )}

        {!isReady ? (
          <p className="small text-body-secondary mb-0">
            The thumbnail can be changed once the video has finished processing.
          </p>
        ) : (
          <>
            <Form noValidate onSubmit={handleImageSubmit} className="d-grid gap-2">
              <FormField
                label="Upload an image"
                type="file"
                accept={IMAGE_ACCEPT}
                className="mb-0"
                help="JPEG, PNG or WebP, up to 5 MB. Resized to 640 pixels wide."
                disabled={isBusy}
                onChange={(event) => setImage(event.target.files[0] ?? null)}
                error={errorMessage(imageUpload.error, 'file')}
              />
              <Button type="submit" variant="outline-primary" disabled={!image || isBusy}>
                Use this image
              </Button>
            </Form>

            <Form noValidate onSubmit={handleFrameSubmit} className="d-grid gap-2">
              <FormField
                label="Or pick a frame (seconds)"
                type="number"
                min={0}
                max={Math.max(0, duration - 1)}
                step="0.5"
                className="mb-0"
                help={`The video is ${formatDuration(duration)} long.`}
                value={seconds}
                disabled={isBusy}
                onChange={(event) => setSeconds(event.target.value)}
                error={frameError ?? errorMessage(frameCapture.error, 'atSeconds')}
              />
              <Button type="submit" variant="outline-primary" disabled={isBusy}>
                Use this frame
              </Button>
            </Form>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
