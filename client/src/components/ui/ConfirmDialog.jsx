import { useId } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

/** Asks the user to confirm a destructive or important action. */
export function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  isConfirming = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();

  return (
    // Naming the dialog by its title lets screen readers announce what it is about.
    <Modal show={show} onHide={onCancel} centered aria-labelledby={titleId}>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5" id={titleId}>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={isConfirming}>
          Cancel
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={isConfirming}>
          {isConfirming && (
            <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
          )}
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
