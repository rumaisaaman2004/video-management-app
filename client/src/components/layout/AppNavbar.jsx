import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link, NavLink } from 'react-router';
import { APP_NAME } from '../../hooks/useDocumentTitle.js';
import { ColorModeToggle } from './ColorModeToggle.jsx';

// Signed-in and admin links are added together with authentication.
const NAV_LINKS = [{ to: '/', label: 'Library', icon: 'collection-play' }];

/** Top navigation; collapses into a menu button on small screens. */
export function AppNavbar() {
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
            {NAV_LINKS.map((link) => (
              <Nav.Item as="li" key={link.to}>
                <Nav.Link as={NavLink} to={link.to} eventKey={link.to} end>
                  <i className={`bi bi-${link.icon} me-1`} aria-hidden="true" />
                  {link.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <div className="d-flex align-items-center gap-2 py-2 py-lg-0">
            <ColorModeToggle />
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
