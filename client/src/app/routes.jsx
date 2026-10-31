import { AppLayout } from '../components/layout/AppLayout.jsx';
import { AccountPage } from '../features/auth/AccountPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { RequireAuth } from '../features/auth/RouteGuards.jsx';
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
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },

      // Signed-in users only.
      {
        element: <RequireAuth />,
        children: [{ path: 'account', element: <AccountPage /> }],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
