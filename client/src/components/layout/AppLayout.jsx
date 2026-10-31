import { Outlet, ScrollRestoration } from 'react-router';
import { APP_NAME } from '../../hooks/useDocumentTitle.js';
import { AppNavbar } from './AppNavbar.jsx';

/** Page frame shared by every route: skip link, navbar, main content and footer. */
export function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <a
        href="#main-content"
        className="visually-hidden-focusable position-absolute top-0 start-0 m-2 p-2 bg-body border rounded"
        style={{ zIndex: 1100 }}
      >
        Skip to main content
      </a>
      <AppNavbar />
      <main id="main-content" tabIndex={-1} className="container flex-grow-1 py-4">
        <Outlet />
      </main>
      <footer className="border-top py-3 small text-body-secondary">
        <div className="container">
          © {new Date().getFullYear()} {APP_NAME}
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
