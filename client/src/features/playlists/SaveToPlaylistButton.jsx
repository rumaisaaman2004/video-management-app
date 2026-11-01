import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import Modal from 'react-bootstrap/Modal';
import { useLocation, useNavigate } from 'react-router';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useApi } from '../../hooks/useApi.js';
import { pluralize } from '../../lib/format.js';
import { useAuth } from '../auth/authContext.js';
import { addVideoToPlaylist, createPlaylist, listMyPlaylists } from './playlistsApi.js';

/** The modal body; mounted only while open, so playlists are fetched fresh each time. */
function SaveToPlaylistDialog({ video, onDone }) {
  const showToast = useToast();
  const playlists = useApi(listMyPlaylists, []);
  const [busyId, setBusyId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTitleError, setNewTitleError] = useState(null);

  async function addTo(playlist) {
    setBusyId(playlist.id);
    try {
      await addVideoToPlaylist(playlist.id, video.id);
      showToast({ message: `Added to “${playlist.title}”.` });
      onDone();
    } catch (err) {
      showToast(
        err.status === 409
          ? { variant: 'info', message: `“${video.title}” is already in “${playlist.title}”.` }
          : { variant: 'danger', message: 'The video could not be added. Try again.' },
      );
      setBusyId(null);
    }
  }

  async function createAndAdd(event) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setNewTitleError('Give the new playlist a title');
      return;
    }
    setBusyId('new');
    try {
      const playlist = await createPlaylist({ title, visibility: 'private' });
      await addTo(playlist);
    } catch {
      showToast({ variant: 'danger', message: 'The playlist could not be created. Try again.' });
      setBusyId(null);
    }
  }

  function renderPlaylists() {
    if (playlists.error) {
      return (
        <ErrorState message="Your playlists could not be loaded." onRetry={playlists.reload} />
      );
    }
    if (!playlists.data) return <LoadingSpinner label="Loading playlists…" />;
    if (playlists.data.length === 0) {
      return <p className="text-body-secondary">You have no playlists yet. Create one below.</p>;
    }
    return (
      <ListGroup className="mb-3">
        {playlists.data.map((playlist) => (
          <ListGroup.Item key={playlist.id} className="d-flex align-items-center gap-3">
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="fw-semibold text-truncate">{playlist.title}</div>
              <div className="small text-body-secondary">
                {pluralize(playlist.videoCount, 'video')} ·{' '}
                {playlist.visibility === 'public' ? 'Public' : 'Private'}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline-primary"
              disabled={busyId !== null}
              aria-label={`Add to ${playlist.title}`}
              onClick={() => addTo(playlist)}
            >
              Add
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  }

  return (
    <>
      {renderPlaylists()}
      <Form noValidate onSubmit={createAndAdd}>
        <Form.Label htmlFor="new-playlist-title">Or create a new playlist</Form.Label>
        <InputGroup hasValidation>
          <Form.Control
            id="new-playlist-title"
            placeholder="Playlist title"
            maxLength={150}
            value={newTitle}
            isInvalid={Boolean(newTitleError)}
            aria-invalid={newTitleError ? true : undefined}
            aria-describedby={newTitleError ? 'new-playlist-title-error' : undefined}
            onChange={(event) => {
              setNewTitle(event.target.value);
              setNewTitleError(null);
            }}
          />
          <Button type="submit" disabled={busyId !== null}>
            Create and add
          </Button>
          <Form.Control.Feedback type="invalid" id="new-playlist-title-error">
            {newTitleError}
          </Form.Control.Feedback>
        </InputGroup>
        <Form.Text muted>New playlists are private. You can share them later.</Form.Text>
      </Form>
    </>
  );
}

/** "Save to playlist" on the watch page. Signed-out visitors are sent to sign in first. */
export function SaveToPlaylistButton({ video }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  function open() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setIsOpen(true);
  }

  return (
    <>
      <Button variant="outline-secondary" onClick={open}>
        <i className="bi bi-collection-play me-2" aria-hidden="true" />
        Save to playlist
      </Button>
      <Modal
        show={isOpen}
        onHide={() => setIsOpen(false)}
        centered
        aria-labelledby="save-to-playlist-title"
      >
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5" id="save-to-playlist-title">
            Save to playlist
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isOpen && <SaveToPlaylistDialog video={video} onDone={() => setIsOpen(false)} />}
        </Modal.Body>
      </Modal>
    </>
  );
}
