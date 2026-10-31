import Badge from 'react-bootstrap/Badge';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../features/auth/authContext.js';
import { useToast } from '../ui/toastContext.js';

/** Signed-in: a menu with the user's name. Signed-out: sign-in and register buttons. */
export function UserMenu() {
  const { status, user, isAdmin, logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  // Show nothing until the saved session has been checked, so the buttons do not flicker.
  if (status === 'loading') return null;

  if (status === 'anonymous') {
    return (
      <>
        <Link to="/login" className="btn btn-outline-primary btn-sm">
          Sign in
        </Link>
        <Link to="/register" className="btn btn-primary btn-sm">
          Create account
        </Link>
      </>
    );
  }

  async function handleSignOut() {
    navigate('/');
    await logout();
    showToast({ variant: 'info', message: 'You have signed out.' });
  }

  return (
    <NavDropdown
      id="user-menu"
      align="end"
      title={
        <>
          <i className="bi bi-person-circle me-1" aria-hidden="true" />
          {user.name}
        </>
      }
    >
      <NavDropdown.Header>
        <div className="text-truncate">{user.email}</div>
        {isAdmin && (
          <Badge bg="primary" className="mt-1">
            Administrator
          </Badge>
        )}
      </NavDropdown.Header>
      <NavDropdown.Item as={Link} to="/account">
        <i className="bi bi-person me-2" aria-hidden="true" />
        Your account
      </NavDropdown.Item>
      <NavDropdown.Divider />
      <NavDropdown.Item as="button" onClick={handleSignOut}>
        <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
        Sign out
      </NavDropdown.Item>
    </NavDropdown>
  );
}
