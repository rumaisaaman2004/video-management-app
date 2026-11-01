import { createBrowserRouter, RouterProvider } from 'react-router';
import { ToastProvider } from '../components/ui/ToastProvider.jsx';
import { AuthProvider } from '../features/auth/AuthProvider.jsx';
import { routes } from './routes.jsx';

const router = createBrowserRouter(routes);

/** Root component: app-wide providers around the router. */
export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
