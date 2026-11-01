import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { deleteVideo } from './adminVideosApi.js';

/** Permanently deletes the video after confirmation, then returns to the video list. */
export function DeleteVideoPanel({ video }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const deletion = useAsyncAction(async () => {
    await deleteVideo(video.id);
    return true;
  });

  async function handleConfirm() {
    const deleted = await deletion.run();
    setIsConfirming(false);
    if (deleted) {
      showToast({ message: `“${video.title}” was deleted.` });
      navigate('/admin/videos');
    } else {
      showToast({ variant: 'danger', message: 'The video could not be deleted. Try again.' });
    }
  }

  return (
    <Card border="danger">
      <Card.Body className="d-grid gap-2">
        <h2 className="h5 mb-0 text-danger">Delete video</h2>
        <p className="small mb-0">
          Removes the video, its files and everyone’s likes, favourites and history for it.
        </p>
        <Button variant="outline-danger" onClick={() => setIsConfirming(true)}>
          Delete this video
        </Button>
      </Card.Body>
      <ConfirmDialog
        show={isConfirming}
        title="Delete this video?"
        message={`“${video.title}” and all its files will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete video"
        isConfirming={deletion.isRunning}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirming(false)}
      />
    </Card>
  );
}
