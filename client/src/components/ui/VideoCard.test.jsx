import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../test/render.jsx';
import { VideoCard } from './VideoCard.jsx';

const baseVideo = {
  id: 'video-1',
  title: 'React Hooks in Depth',
  status: 'ready',
  visibility: 'public',
  durationSeconds: 125,
  viewCount: 1500,
  createdAt: new Date().toISOString(),
  category: { id: 'c1', name: 'Web Development', slug: 'web-development' },
  thumbnailUrl: '/api/videos/video-1/thumbnail?v=1',
};

describe('VideoCard', () => {
  it('links the title to the video page and shows its details', () => {
    renderWithRouter(<VideoCard video={baseVideo} />);

    expect(screen.getByRole('link', { name: 'React Hooks in Depth' })).toHaveAttribute(
      'href',
      '/videos/video-1',
    );
    expect(screen.getByText(/Web Development · 1\.5K views · just now/)).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('exposes only one link to keyboard and screen-reader users', () => {
    renderWithRouter(<VideoCard video={baseVideo} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('describes watch progress and completion', () => {
    renderWithRouter(
      <VideoCard
        video={{ ...baseVideo, viewer: { progressSeconds: 50, completed: true, liked: false } }}
      />,
    );

    expect(screen.getByText(/40% watched/)).toBeInTheDocument();
    expect(screen.getByText('Watched')).toBeInTheDocument();
  });

  it('marks unprocessed and private videos for admins', () => {
    renderWithRouter(
      <VideoCard
        video={{ ...baseVideo, status: 'processing', visibility: 'private', thumbnailUrl: null }}
      />,
    );

    expect(screen.getByText(/Processing, Private/)).toBeInTheDocument();
  });

  it('renders extra actions', () => {
    renderWithRouter(
      <VideoCard video={baseVideo} actions={<button type="button">Remove</button>} />,
    );

    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});
