import Button from 'react-bootstrap/Button';
import { Link } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useApi } from '../../hooks/useApi.js';
import { useSearchParamsState } from '../../hooks/useSearchParamsState.js';
import { pluralize } from '../../lib/format.js';
import { setBookmarked } from '../watch/watchApi.js';
import { refreshAfterRemoval } from './listPaging.js';
import { listFavourites } from './meApi.js';
import { PersonalVideoList } from './PersonalVideoList.jsx';

export function FavouritesPage() {
  const showToast = useToast();
  const { page, update } = useSearchParamsState();
  const favourites = useApi((signal) => listFavourites({ page }, signal), [page]);

  async function removeFavourite(video) {
    try {
      await setBookmarked(video.id, false);
      showToast({ message: `Removed “${video.title}” from your favourites.` });
      refreshAfterRemoval({ videos: favourites, page, update });
    } catch {
      showToast({ variant: 'danger', message: 'That video could not be removed. Try again.' });
    }
  }

  return (
    <>
      <PageHeader
        title="Favourites"
        subtitle={
          favourites.data
            ? `${pluralize(favourites.data.meta.total, 'saved video')}, newest first.`
            : 'Videos you saved to watch later.'
        }
      />
      <PersonalVideoList
        videos={favourites}
        heading="Saved videos"
        page={page}
        onPageChange={(nextPage) => update({ page: nextPage })}
        renderActions={(video) => (
          <Button
            size="sm"
            variant="outline-secondary"
            className="align-self-start mt-1"
            aria-label={`Remove ${video.title} from favourites`}
            onClick={() => removeFavourite(video)}
          >
            <i className="bi bi-bookmark-x me-1" aria-hidden="true" />
            Remove
          </Button>
        )}
        emptyState={
          <EmptyState
            icon="bookmark"
            title="No favourites yet"
            message="Use Save on any video to keep it here."
            action={
              <Link to="/" className="btn btn-primary">
                Browse the library
              </Link>
            }
          />
        }
      />
    </>
  );
}
