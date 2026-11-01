import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import { useLocation, useNavigate } from 'react-router';
import { useToast } from '../../components/ui/toastContext.js';
import { formatCount } from '../../lib/format.js';
import { useAuth } from '../auth/authContext.js';
import { setBookmarked, setLiked } from './watchApi.js';

/**
 * Like and Save (favourite) toggles. They update immediately and roll back with
 * a message if the server refuses; signed-out visitors are sent to sign in first.
 */
export function VideoActions({ video }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();

  const [liked, setLikedState] = useState(video.viewer?.liked ?? false);
  const [likeCount, setLikeCount] = useState(video.likeCount ?? 0);
  const [bookmarked, setBookmarkedState] = useState(video.viewer?.bookmarked ?? false);

  function requireSignIn() {
    if (isAuthenticated) return false;
    navigate('/login', { state: { from: location } });
    return true;
  }

  async function toggleLike() {
    if (requireSignIn()) return;
    const next = !liked;
    setLikedState(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    try {
      setLikeCount((await setLiked(video.id, next)).likeCount);
    } catch {
      setLikedState(!next);
      setLikeCount((count) => count + (next ? -1 : 1));
      showToast({ variant: 'danger', message: 'Your like could not be saved. Try again.' });
    }
  }

  async function toggleBookmark() {
    if (requireSignIn()) return;
    const next = !bookmarked;
    setBookmarkedState(next);
    try {
      await setBookmarked(video.id, next);
      showToast({ message: next ? 'Saved to your favourites.' : 'Removed from your favourites.' });
    } catch {
      setBookmarkedState(!next);
      showToast({ variant: 'danger', message: 'Your favourites could not be updated. Try again.' });
    }
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      <Button
        variant={liked ? 'primary' : 'outline-secondary'}
        aria-pressed={liked}
        onClick={toggleLike}
      >
        <i className={`bi bi-hand-thumbs-up${liked ? '-fill' : ''} me-2`} aria-hidden="true" />
        Like <span className="ms-1 fw-semibold">{formatCount(likeCount)}</span>
      </Button>
      <Button
        variant={bookmarked ? 'primary' : 'outline-secondary'}
        aria-pressed={bookmarked}
        onClick={toggleBookmark}
      >
        <i className={`bi bi-bookmark${bookmarked ? '-fill' : ''} me-2`} aria-hidden="true" />
        {bookmarked ? 'Saved' : 'Save'}
      </Button>
    </div>
  );
}
