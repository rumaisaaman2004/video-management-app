import { useId, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import { FormField } from '../../components/ui/FormField.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { fieldErrorsFromApiError } from '../../lib/formErrors.js';
import {
  EMPTY_PLAYLIST_DETAILS,
  PLAYLIST_VISIBILITY_OPTIONS,
  toPlaylistPayload,
  validatePlaylistDetails,
} from './playlistDetails.js';

/**
 * Create or edit a playlist's title, description and visibility.
 * `onSubmit(payload)` must resolve with a truthy value on success; the modal then closes.
 */
export function PlaylistFormModal({
  show,
  heading,
  submitLabel,
  initialValues = EMPTY_PLAYLIST_DETAILS,
  onSubmit,
  onHide,
}) {
  const titleId = useId();
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState({});
  const saving = useAsyncAction(onSubmit);

  const serverFieldErrors = fieldErrorsFromApiError(saving.error);
  const errors = { ...serverFieldErrors, ...clientErrors };
  const formError =
    saving.error && Object.keys(serverFieldErrors).length === 0 ? saving.error.message : null;

  // Start from the given values each time the modal opens.
  function handleEnter() {
    setValues(initialValues);
    setClientErrors({});
    saving.reset();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setClientErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validatePlaylistDetails(values);
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (await saving.run(toPlaylistPayload(values))) onHide();
  }

  return (
    <Modal show={show} onHide={onHide} onEnter={handleEnter} centered aria-labelledby={titleId}>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5" id={titleId}>
            {heading}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <Alert variant="danger">{formError}</Alert>}
          <FormField
            label="Title"
            name="title"
            required
            maxLength={150}
            value={values.title}
            onChange={handleChange}
            error={errors.title}
          />
          <FormField
            label="Description"
            name="description"
            as="textarea"
            rows={3}
            maxLength={1000}
            value={values.description}
            onChange={handleChange}
            error={errors.description}
          />
          <FormField
            label="Visibility"
            name="visibility"
            as="select"
            className="mb-0"
            options={PLAYLIST_VISIBILITY_OPTIONS}
            value={values.visibility}
            onChange={handleChange}
            error={errors.visibility}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving.isRunning}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving.isRunning}>
            {saving.isRunning && (
              <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
            )}
            {submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
