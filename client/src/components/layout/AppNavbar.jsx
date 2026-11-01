import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../features/auth/authContext.js';
import { APP_NAME } from '../../hooks/useDocumentTitle.js';
import { ColorModeToggle } from './ColorModeToggle.jsx';
import { UserMenu } from './UserMenu.jsx';

// `requiresAuth` / `adminOnly` hide links the visitor cannot use.
const NAV_LINKS = [
  { to: '/', label: 'Library', icon: 'collection-play' },
  { to: '/admin/videos', label: 'Manage videos', icon: 'sliders', adminOnly: true },
];

/** Top navigation; collapses into a menu button on small screens. */
export function AppNavbar() {
  const { isAuthenticated, isAdmin } = useAuth();
  const visibleLinks = NAV_LINKS.filter(
    (link) => (!link.requiresAuth || isAuthenticated) && (!link.adminOnly || isAdmin),
  );

  return (
    <Navbar expand="lg" sticky="top" collapseOnSelect className="bg-body border-bottom">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-semibold">
          <i className="bi bi-play-btn-fill text-primary me-2" aria-hidden="true" />
          {APP_NAME}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navigation" />
        <Navbar.Collapse id="main-navigation">
          <Nav className="me-auto" as="ul">
            {visibleLinks.map((link) => (
              <Nav.Item as="li" key={link.to}>
                {/* The library link is active only on "/"; others also on their sub-pages. */}
                <Nav.Link as={NavLink} to={link.to} eventKey={link.to} end={link.to === '/'}>
                  <i className={`bi bi-${link.icon} me-1`} aria-hidden="true" />
                  {link.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <Nav className="d-flex flex-row align-items-center gap-2 py-2 py-lg-0">
            <ColorModeToggle />
            <UserMenu />
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
