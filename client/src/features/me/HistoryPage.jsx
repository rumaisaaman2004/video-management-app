import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { Link } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { useApi } from '../../hooks/useApi.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useSearchParamsState } from '../../hooks/useSearchParamsState.js';
import { refreshAfterRemoval } from './listPaging.js';
import { clearHistory, listHistory, removeFromHistory } from './meApi.js';
import { PersonalVideoList } from './PersonalVideoList.jsx';

const VIEWS = [
  { value: 'all', label: 'All history' },
  { value: 'in-progress', label: 'Continue watching' },
];

export function HistoryPage() {
  const showToast = useToast();
  const { get, page, update } = useSearchParamsState();
  const view = get('view') === 'in-progress' ? 'in-progress' : 'all';
  const inProgress = view === 'in-progress';

  const history = useApi((signal) => listHistory({ page, inProgress }, signal), [page, inProgress]);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const clearing = useAsyncAction(async () => {
    await clearHistory();
    return true;
  });

  async function removeEntry(video) {
    try {
      await removeFromHistory(video.id);
      showToast({ message: `Removed “${video.title}” from your history.` });
      refreshAfterRemoval({ videos: history, page, update });
    } catch {
      showToast({ variant: 'danger', message: 'That video could not be removed. Try again.' });
    }
  }

  async function confirmClear() {
    const cleared = await clearing.run();
    setIsConfirmingClear(false);
    if (cleared) {
      showToast({ message: 'Your watch history was cleared.' });
      update({ page: 1 });
      history.reload();
    } else {
      showToast({ variant: 'danger', message: 'Your history could not be cleared. Try again.' });
    }
  }

  const isEmpty = history.data?.meta.total === 0;

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Videos you have watched, most recent first."
        actions={
          <Button
            variant="outline-danger"
            disabled={!history.data || (isEmpty && !inProgress)}
            onClick={() => setIsConfirmingClear(true)}
          >
            <i className="bi bi-trash me-2" aria-hidden="true" />
            Clear history
          </Button>
        }
      />

      <ButtonGroup aria-label="Which videos to show" className="mb-4">
        {VIEWS.map((option) => (
          <Button
            key={option.value}
            variant={view === option.value ? 'primary' : 'outline-primary'}
            aria-pressed={view === option.value}
            onClick={() => update({ view: option.value === 'all' ? '' : option.value })}
          >
            {option.label}
          </Button>
        ))}
      </ButtonGroup>

      <PersonalVideoList
        videos={history}
        heading={inProgress ? 'Videos in progress' : 'Watched videos'}
        page={page}
        onPageChange={(nextPage) => update({ page: nextPage })}
        renderActions={(video) => (
          <Button
            size="sm"
            variant="outline-secondary"
            className="align-self-start mt-1"
            aria-label={`Remove ${video.title} from history`}
            onClick={() => removeEntry(video)}
          >
            <i className="bi bi-x-lg me-1" aria-hidden="true" />
            Remove
          </Button>
        )}
        emptyState={
          <EmptyState
            icon={inProgress ? 'play-circle' : 'clock-history'}
            title={inProgress ? 'Nothing in progress' : 'No history yet'}
            message={
              inProgress
                ? 'Videos you start but do not finish will appear here.'
                : 'Videos you watch will appear here.'
            }
            action={
              <Link to="/" className="btn btn-primary">
                Browse the library
              </Link>
            }
          />
        }
      />

      <ConfirmDialog
        show={isConfirmingClear}
        title="Clear your watch history?"
        message="All videos and saved positions are removed from your history. Your favourites and playlists are kept."
        confirmLabel="Clear history"
        isConfirming={clearing.isRunning}
        onConfirm={confirmClear}
        onCancel={() => setIsConfirmingClear(false)}
      />
    </>
  );
}
