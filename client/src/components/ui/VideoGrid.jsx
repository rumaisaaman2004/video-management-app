import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { VideoCard, VideoCardSkeleton } from './VideoCard.jsx';

const DEFAULT_SKELETON_COUNT = 8;

/**
 * Responsive grid of video cards: 1 column on phones up to 4 on wide screens.
 * While `isLoading`, shows card-shaped placeholders instead.
 * `renderActions(video)` adds controls to each card (e.g. "Remove").
 */
export function VideoGrid({ videos = [], isLoading = false, renderActions }) {
  const items = isLoading ? Array.from({ length: DEFAULT_SKELETON_COUNT }) : videos;

  return (
    <Row xs={1} sm={2} lg={3} xl={4} className="g-4" aria-busy={isLoading}>
      {items.map((video, index) => (
        <Col key={video?.id ?? index}>
          {isLoading ? (
            <VideoCardSkeleton />
          ) : (
            <VideoCard video={video} actions={renderActions?.(video)} />
          )}
        </Col>
      ))}
    </Row>
  );
}
