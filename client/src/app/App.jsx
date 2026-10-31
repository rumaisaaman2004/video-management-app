import { createBrowserRouter, RouterProvider } from 'react-router';
import { ToastProvider } from '../components/ui/ToastProvider.jsx';
import { routes } from './routes.jsx';

const router = createBrowserRouter(routes);

/** Root component: app-wide providers around the router. */
export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
