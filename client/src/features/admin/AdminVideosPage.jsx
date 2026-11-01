import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { Link } from 'react-router';
import { AppPagination } from '../../components/ui/AppPagination.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SearchBox } from '../../components/ui/SearchBox.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { VideoStatusBadge, VisibilityBadge } from '../../components/ui/VideoStatusBadge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useSearchParamsState } from '../../hooks/useSearchParamsState.js';
import { formatCount, formatDuration, pluralize } from '../../lib/format.js';
import { deleteVideo, listAdminVideos } from './adminVideosApi.js';

// Each sortable column maps its two directions to the API's sort values.
const COLUMN_SORTS = {
  title: { asc: 'title', desc: 'title-desc' },
  viewCount: { asc: 'least-viewed', desc: 'popular' },
  createdAt: { asc: 'oldest', desc: 'newest' },
};
const DEFAULT_SORT = 'newest';
// While any listed video is processing, refresh so its status updates on its own.
const PROCESSING_REFRESH_MS = 5000;

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
];
const VISIBILITY_OPTIONS = [
  { value: '', label: 'Any visibility' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

const uploadedFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

function columnSortFor(sort) {
  for (const [key, directions] of Object.entries(COLUMN_SORTS)) {
    for (const [direction, value] of Object.entries(directions)) {
      if (value === sort) return { key, direction };
    }
  }
  return { key: 'createdAt', direction: 'desc' };
}

function VideoTitleCell({ video }) {
  return (
    <div className="d-flex align-items-center gap-3" style={{ minWidth: '16rem' }}>
      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt=""
          width="80"
          height="45"
          className="rounded flex-shrink-0"
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div
          className="rounded bg-body-tertiary d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 80, height: 45 }}
        >
          <i className="bi bi-film text-body-secondary" aria-hidden="true" />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <Link to={`/admin/videos/${video.id}/edit`} className="fw-semibold">
          {video.title}
        </Link>
        <div className="small text-body-secondary">{video.category?.name ?? 'No category'}</div>
      </div>
    </div>
  );
}

export function AdminVideosPage() {
  const showToast = useToast();
  const { get, page, update } = useSearchParamsState();
  const q = get('q');
  const status = get('status');
  const visibility = get('visibility');
  const sort = get('sort') || DEFAULT_SORT;

  const videos = useApi(
    (signal) => listAdminVideos({ q, status, visibility, sort, page }, signal),
    [q, status, visibility, sort, page],
  );
  const rows = videos.data?.data ?? [];
  const hasProcessing = rows.some((video) => video.status === 'processing');
  const { reload } = videos;

  useEffect(() => {
    if (!hasProcessing) return undefined;
    const timer = setTimeout(reload, PROCESSING_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [hasProcessing, reload, videos.data]);

  const [videoToDelete, setVideoToDelete] = useState(null);
  const deletion = useAsyncAction(async (video) => {
    await deleteVideo(video.id);
    return video;
  });

  async function confirmDelete() {
    const deleted = await deletion.run(videoToDelete);
    setVideoToDelete(null);
    if (deleted) {
      showToast({ message: `“${deleted.title}” was deleted.` });
      reload();
    } else {
      showToast({ variant: 'danger', message: 'The video could not be deleted. Try again.' });
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Video',
      sortable: true,
      render: (video) => <VideoTitleCell video={video} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (video) => <VideoStatusBadge status={video.status} showReady />,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (video) => <VisibilityBadge visibility={video.visibility} />,
    },
    {
      key: 'durationSeconds',
      header: 'Length',
      className: 'text-end',
      // Only the values use fixed-width digits, so lengths line up; the header stays normal text.
      render: (video) => (
        <span className="font-monospace small">{formatDuration(video.durationSeconds) || '—'}</span>
      ),
    },
    {
      key: 'viewCount',
      header: 'Views',
      sortable: true,
      className: 'text-end',
      render: (video) => formatCount(video.viewCount),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      sortable: true,
      className: 'text-nowrap',
      render: (video) => uploadedFormat.format(new Date(video.createdAt)),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end text-nowrap',
      render: (video) => (
        <div className="d-inline-flex gap-2">
          <Link
            to={`/admin/videos/${video.id}/edit`}
            className="btn btn-sm btn-outline-secondary"
            aria-label={`Edit ${video.title}`}
          >
            <i className="bi bi-pencil" aria-hidden="true" />
          </Link>
          <Button
            size="sm"
            variant="outline-danger"
            aria-label={`Delete ${video.title}`}
            onClick={() => setVideoToDelete(video)}
          >
            <i className="bi bi-trash" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(q || status || visibility);

  function renderTable() {
    if (videos.error && !videos.data) {
      return <ErrorState message="The videos could not be loaded." onRetry={reload} />;
    }
    if (!videos.data) return <LoadingSpinner label="Loading videos…" />;

    return (
      <>
        <div style={{ opacity: videos.isLoading ? 0.6 : 1 }} aria-busy={videos.isLoading}>
          <DataTable
            caption="All videos"
            columns={columns}
            rows={rows}
            getRowKey={(video) => video.id}
            sort={columnSortFor(sort)}
            onSortChange={({ key, direction }) => update({ sort: COLUMN_SORTS[key][direction] })}
            emptyMessage={
              hasFilters ? 'No videos match these filters.' : 'No videos yet. Upload the first one.'
            }
          />
        </div>
        <AppPagination
          page={page}
          totalPages={videos.data.meta.totalPages}
          onPageChange={(nextPage) => update({ page: nextPage })}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Manage videos"
        subtitle="Every video, including private ones and those still processing."
        actions={
          <Link to="/admin/videos/new" className="btn btn-primary">
            <i className="bi bi-cloud-arrow-up me-2" aria-hidden="true" />
            Upload video
          </Link>
        }
      />

      <Row className="g-3 align-items-end mb-3">
        <Col xs={12} lg>
          <SearchBox
            value={q}
            placeholder="Search videos"
            onSearch={(text) => update({ q: text }, { replace: true })}
          />
        </Col>
        <Col xs={6} lg={2}>
          <FormField
            label="Status"
            as="select"
            className="mb-0"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => update({ status: event.target.value })}
          />
        </Col>
        <Col xs={6} lg={2}>
          <FormField
            label="Visibility"
            as="select"
            className="mb-0"
            options={VISIBILITY_OPTIONS}
            value={visibility}
            onChange={(event) => update({ visibility: event.target.value })}
          />
        </Col>
      </Row>

      <p className="small text-body-secondary mb-2" aria-live="polite">
        {videos.data && pluralize(videos.data.meta.total, 'video')}
      </p>
      {renderTable()}

      <ConfirmDialog
        show={videoToDelete !== null}
        title="Delete this video?"
        message={
          videoToDelete &&
          `“${videoToDelete.title}” and all its files will be permanently deleted. This cannot be undone.`
        }
        confirmLabel="Delete video"
        isConfirming={deletion.isRunning}
        onConfirm={confirmDelete}
        onCancel={() => setVideoToDelete(null)}
      />
    </>
  );
}
