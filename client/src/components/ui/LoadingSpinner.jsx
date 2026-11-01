import Spinner from 'react-bootstrap/Spinner';

/** Centered spinner with a screen-reader label. */
export function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="d-flex justify-content-center py-5" role="status">
      <Spinner animation="border" variant="primary" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
