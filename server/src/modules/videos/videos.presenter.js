import { signPath } from '../../lib/signedUrls.js';

// Long enough to watch a video; short enough that a leaked link soon stops working.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Anyone may watch a video once it is processed and public. */
export function isPubliclyWatchable(video) {
  return video.status === 'ready' && video.visibility === 'public';
}

/** Public media gets plain, cacheable URLs; restricted media gets expiring signed URLs. */
function mediaUrl(video, path) {
  return isPubliclyWatchable(video) ? path : signPath(path, SIGNED_URL_TTL_SECONDS);
}

function withQueryParam(url, param) {
  return `${url}${url.includes('?') ? '&' : '?'}${param}`;
}

/**
 * Shapes a video for API responses. Pass `renditions` for the detail view,
 * which lists every playable quality with its stream URL.
 */
export function presentVideo(video, renditions) {
  const { thumbnailCreatedAt, ...fields } = video;
  const basePath = `/api/videos/${video.id}`;

  const presented = {
    ...fields,
    // The version parameter changes when the thumbnail is replaced, so browsers refetch it.
    thumbnailUrl: thumbnailCreatedAt
      ? withQueryParam(
          mediaUrl(video, `${basePath}/thumbnail`),
          `v=${thumbnailCreatedAt.getTime()}`,
        )
      : null,
  };

  if (renditions) {
    presented.renditions = renditions.map(({ label, width, height }) => ({
      label,
      width,
      height,
      url: mediaUrl(video, `${basePath}/renditions/${label}`),
    }));
  }

  return presented;
}
