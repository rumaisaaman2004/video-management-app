import { AppLayout } from '../components/layout/AppLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { RouteErrorPage } from '../pages/RouteErrorPage.jsx';

/** Route table; shared by the browser router and by tests (with a memory router). */
export const routes = [
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
