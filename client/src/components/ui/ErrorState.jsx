import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

/** Shown when loading data fails; offers a retry when the caller can reload. */
export function ErrorState({ message = 'Something went wrong while loading this page.', onRetry }) {
  return (
    <Alert variant="danger" className="d-flex flex-wrap align-items-center gap-3">
      <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
      <span className="flex-grow-1">{message}</span>
      {onRetry && (
        <Button variant="outline-danger" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  );
}
