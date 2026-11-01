import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import { Link, useNavigate, useParams } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { VisibilityBadge } from '../../components/ui/VideoStatusBadge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { pluralize } from '../../lib/format.js';
import { useAuth } from '../auth/authContext.js';
import { playlistDetailsFrom } from './playlistDetails.js';
import { PlaylistFormModal } from './PlaylistFormModal.jsx';
import {
  deletePlaylist,
  getPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylist,
  updatePlaylist,
} from './playlistsApi.js';
import { PlaylistVideoList } from './PlaylistVideoList.jsx';

/** Copies the playlist's address, explaining who can open it. */
async function copyShareLink(playlist, showToast) {
  // Built from the ID rather than the address bar, so it is always the clean, canonical link.
  const url = new URL(`/playlists/${playlist.id}`, window.location.origin).href;
  const audience =
    playlist.visibility === 'public'
      ? 'Anyone with the link can view this playlist.'
      : 'This playlist is private, so only you can open the link. Make it public to share it.';
  try {
    await navigator.clipboard.writeText(url);
    showToast({ variant: 'info', message: `Link copied. ${audience}` });
  } catch {
    showToast({ variant: 'info', message: `Copy this link: ${url}. ${audience}` });
  }
}

function PlaylistView({ initialPlaylist }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  // Every change returns the updated playlist from the server; show exactly that.
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [isBusy, setIsBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  useDocumentTitle(playlist.title);

  const isOwner = user?.id === playlist.owner.id;
  const { videos } = playlist;

  /** Runs a change to the playlist's videos, keeping the list disabled until it finishes. */
  async function changeVideos(request, successMessage) {
    setIsBusy(true);
    try {
      setPlaylist(await request());
      setAnnouncement(successMessage);
    } catch {
      showToast({ variant: 'danger', message: 'The playlist could not be updated. Try again.' });
    } finally {
      setIsBusy(false);
    }
  }

  function moveVideo(index, direction) {
    const reordered = [...videos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + direction, 0, moved);
    changeVideos(
      () =>
        reorderPlaylist(
          playlist.id,
          reordered.map((video) => video.id),
        ),
      `Moved “${moved.title}” to position ${index + direction + 1}.`,
    );
  }

  function removeVideo(video) {
    changeVideos(
      () => removeVideoFromPlaylist(playlist.id, video.id),
      `Removed “${video.title}” from the playlist.`,
    );
  }

  async function saveDetails(changes) {
    const updated = await updatePlaylist(playlist.id, changes);
    setPlaylist(updated);
    showToast({ message: 'Playlist updated.' });
    return updated;
  }

  async function confirmDelete() {
    try {
      await deletePlaylist(playlist.id);
      showToast({ message: `Deleted “${playlist.title}”.` });
      navigate('/playlists');
    } catch {
      setIsConfirmingDelete(false);
      showToast({ variant: 'danger', message: 'The playlist could not be deleted. Try again.' });
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <div style={{ minWidth: 0 }}>
          <div className="small text-body-secondary mb-1">
            <i className="bi bi-collection-play me-1" aria-hidden="true" />
            Playlist by {isOwner ? 'you' : playlist.owner.name}
          </div>
          <h1 className="h3 mb-2">{playlist.title}</h1>
          <div className="d-flex flex-wrap align-items-center gap-2 small text-body-secondary">
            <VisibilityBadge visibility={playlist.visibility} />
            {pluralize(videos.length, 'video')}
          </div>
          {playlist.description && (
            <p className="mt-2 mb-0" style={{ whiteSpace: 'pre-line' }}>
              {playlist.description}
            </p>
          )}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {videos.length > 0 && (
            <Link to={`/videos/${videos[0].id}`} className="btn btn-primary">
              <i className="bi bi-play-fill me-1" aria-hidden="true" />
              Play
            </Link>
          )}
          <Button variant="outline-secondary" onClick={() => copyShareLink(playlist, showToast)}>
            <i className="bi bi-share me-2" aria-hidden="true" />
            Share
          </Button>
          {isOwner && (
            <>
              <Button variant="outline-secondary" onClick={() => setIsEditing(true)}>
                <i className="bi bi-pencil me-2" aria-hidden="true" />
                Edit
              </Button>
              <Button variant="outline-danger" onClick={() => setIsConfirmingDelete(true)}>
                <i className="bi bi-trash me-2" aria-hidden="true" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Announces moves and removals to screen-reader users. */}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

      {videos.length === 0 ? (
        <EmptyState
          icon="collection-play"
          title="This playlist is empty"
          message={
            isOwner
              ? 'Open any video and use “Save to playlist” to add it here.'
              : 'There are no videos you can watch in this playlist yet.'
          }
          action={
            <Link to="/" className="btn btn-primary">
              Browse the library
            </Link>
          }
        />
      ) : (
        <PlaylistVideoList
          videos={videos}
          canEdit={isOwner}
          isBusy={isBusy}
          onMove={moveVideo}
          onRemove={removeVideo}
        />
      )}

      {isOwner && (
        <>
          <PlaylistFormModal
            show={isEditing}
            heading="Edit playlist"
            submitLabel="Save changes"
            initialValues={playlistDetailsFrom(playlist)}
            onSubmit={saveDetails}
            onHide={() => setIsEditing(false)}
          />
          <ConfirmDialog
            show={isConfirmingDelete}
            title="Delete this playlist?"
            message={`“${playlist.title}” will be deleted. The videos themselves are not affected.`}
            confirmLabel="Delete playlist"
            onConfirm={confirmDelete}
            onCancel={() => setIsConfirmingDelete(false)}
          />
        </>
      )}
    </>
  );
}

function PlaylistContent({ playlistId }) {
  const playlist = useApi((signal) => getPlaylist(playlistId, signal), [playlistId]);

  if (playlist.error?.status === 404) {
    return (
      <EmptyState
        icon="collection-play"
        title="Playlist not found"
        message="It may have been deleted, or it is private."
        action={
          <Link to="/" className="btn btn-primary">
            Back to the library
          </Link>
        }
      />
    );
  }
  if (playlist.error && !playlist.data) {
    return <ErrorState message="This playlist could not be loaded." onRetry={playlist.reload} />;
  }
  if (!playlist.data) return <LoadingSpinner label="Loading playlist…" />;

  return <PlaylistView initialPlaylist={playlist.data} />;
}

/** Public playlists open for anyone; private ones only for their owner. */
export function PlaylistPage() {
  const { id } = useParams();
  const { status } = useAuth();

  // Wait for the saved session: a private playlist is only visible to its signed-in owner.
  if (status === 'loading') return <LoadingSpinner label="Loading playlist…" />;

  return <PlaylistContent key={id} playlistId={id} />;
}
