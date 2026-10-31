import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { useAuth } from './authContext.js';

/** Route wrapper: sends signed-out visitors to the login page, then back here afterwards. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingSpinner label="Checking your session…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Route wrapper for admin pages. Use inside RequireAuth. */
export function RequireAdmin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <EmptyState
        icon="shield-lock"
        title="Admins only"
        message="You need an administrator account to open this page."
        action={
          <Link to="/" className="btn btn-primary">
            Back to the library
          </Link>
        }
      />
    );
  }
  return <Outlet />;
}
