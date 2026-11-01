import { Link } from 'react-router';
import { VideoGrid } from '../../components/ui/VideoGrid.jsx';
import { useApi } from '../../hooks/useApi.js';
import { listHistory } from './meApi.js';

const MAX_VIDEOS = 4;

/** A row of started-but-unfinished videos for signed-in users; hidden when there are none. */
export function ContinueWatching() {
  const inProgress = useApi(
    (signal) => listHistory({ page: 1, inProgress: true, pageSize: MAX_VIDEOS }, signal),
    [],
  );
  const videos = inProgress.data?.data ?? [];
  if (videos.length === 0) return null;

  return (
    <section aria-labelledby="continue-watching-heading" className="mb-5">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h2 id="continue-watching-heading" className="h5 mb-0">
          Continue watching
        </h2>
        <Link to="/history?view=in-progress" className="small">
          See all
        </Link>
      </div>
      <VideoGrid videos={videos} />
    </section>
  );
}
