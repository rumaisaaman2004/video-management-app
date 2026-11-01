import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { useNavigate } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useApi } from '../../hooks/useApi.js';
import { PlaylistCard } from './PlaylistCard.jsx';
import { PlaylistFormModal } from './PlaylistFormModal.jsx';
import { createPlaylist, listMyPlaylists } from './playlistsApi.js';

export function MyPlaylistsPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const playlists = useApi(listMyPlaylists, []);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(fields) {
    const playlist = await createPlaylist(fields);
    showToast({ message: `Created “${playlist.title}”.` });
    navigate(`/playlists/${playlist.id}`);
    return playlist;
  }

  function renderContent() {
    if (playlists.error && !playlists.data) {
      return (
        <ErrorState message="Your playlists could not be loaded." onRetry={playlists.reload} />
      );
    }
    if (!playlists.data) return <LoadingSpinner label="Loading playlists…" />;
    if (playlists.data.length === 0) {
      return (
        <EmptyState
          icon="collection-play"
          title="No playlists yet"
          message="Group videos into a course or a watch list, in the order you choose."
          action={<Button onClick={() => setIsCreating(true)}>Create a playlist</Button>}
        />
      );
    }
    return (
      <Row xs={1} sm={2} lg={3} xl={4} className="g-4">
        {playlists.data.map((playlist) => (
          <Col key={playlist.id}>
            <PlaylistCard playlist={playlist} />
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <>
      <PageHeader
        title="Playlists"
        subtitle="Your playlists, most recently changed first."
        actions={
          <Button onClick={() => setIsCreating(true)}>
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            New playlist
          </Button>
        }
      />
      {renderContent()}
      <PlaylistFormModal
        show={isCreating}
        heading="New playlist"
        submitLabel="Create playlist"
        onSubmit={handleCreate}
        onHide={() => setIsCreating(false)}
      />
    </>
  );
}
