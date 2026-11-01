import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.jsx';
import { AdminVideosPage } from '../features/admin/AdminVideosPage.jsx';
import { EditVideoPage } from '../features/admin/EditVideoPage.jsx';
import { UploadVideoPage } from '../features/admin/UploadVideoPage.jsx';
import { AccountPage } from '../features/auth/AccountPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { RequireAdmin, RequireAuth } from '../features/auth/RouteGuards.jsx';
import { FavouritesPage } from '../features/me/FavouritesPage.jsx';
import { HistoryPage } from '../features/me/HistoryPage.jsx';
import { MyPlaylistsPage } from '../features/playlists/MyPlaylistsPage.jsx';
import { PlaylistPage } from '../features/playlists/PlaylistPage.jsx';
import { LibraryPage } from '../features/videos/LibraryPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { RouteErrorPage } from '../pages/RouteErrorPage.jsx';

/** Route table; shared by the browser router and by tests (with a memory router). */
export const routes = [
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    // Shown while a lazily loaded page (the video player) is fetched on the very first load.
    hydrateFallbackElement: <LoadingSpinner />,
    children: [
      { index: true, element: <LibraryPage /> },
      // Loaded on first visit, so other pages never download the video player.
      {
        path: 'videos/:id',
        lazy: async () => ({
          Component: (await import('../features/watch/WatchPage.jsx')).WatchPage,
        }),
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      // Public playlists can be opened by anyone; the page itself hides private ones.
      { path: 'playlists/:id', element: <PlaylistPage /> },

      // Signed-in users only.
      {
        element: <RequireAuth />,
        children: [
          { path: 'account', element: <AccountPage /> },
          { path: 'favourites', element: <FavouritesPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'playlists', element: <MyPlaylistsPage /> },

          // Admins only.
          {
            element: <RequireAdmin />,
            children: [
              { path: 'admin/videos', element: <AdminVideosPage /> },
              { path: 'admin/videos/new', element: <UploadVideoPage /> },
              { path: 'admin/videos/:id/edit', element: <EditVideoPage /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
