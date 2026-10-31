import { publicThumbnailUrl } from '../videos/videos.presenter.js';

/** Shapes a playlist for API responses; the cover is its first watchable video's thumbnail. */
export function presentPlaylist(playlist) {
  const { ownerId, ownerName, coverVideoId, coverThumbnailCreatedAt, ...fields } = playlist;

  return {
    ...fields,
    owner: { id: ownerId, name: ownerName },
    coverThumbnailUrl: coverVideoId
      ? publicThumbnailUrl(coverVideoId, coverThumbnailCreatedAt)
      : null,
  };
}
