import { Link } from 'react-router';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <EmptyState
      icon="signpost-split"
      titleAs="h1"
      title="Page not found"
      message="The page you are looking for does not exist or has moved."
      action={
        <Link to="/" className="btn btn-primary">
          Back to the library
        </Link>
      }
    />
  );
}
