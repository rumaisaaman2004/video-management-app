import { useRouteError } from 'react-router';
import { ErrorState } from '../components/ui/ErrorState.jsx';

/** Shown when a page crashes while rendering, instead of a blank screen. */
export function RouteErrorPage() {
  const error = useRouteError();
  // Logged for developers; users only see a friendly message.
  console.error(error);

  return (
    <div className="container py-5">
      <ErrorState
        message="Sorry, this page ran into a problem."
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
