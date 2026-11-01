import { AppError } from '../../errors/AppError.js';
import { pageWindow, paginationMeta } from '../../lib/commonSchemas.js';
import { createEngagementRepository } from './engagement.repository.js';

// Watching this share of a video counts as finishing it (end credits are often skipped).
const COMPLETION_THRESHOLD = 0.95;

const isAdmin = (viewer) => viewer.role === 'admin';

export function createEngagementService({ pool, videosService }) {
  const engagement = createEngagementRepository(pool);

  /** Turns a page of video IDs into the standard `{ data, meta }` list response. */
  async function toCardPage({ videoIds, total }, query, viewer) {
    return {
      data: await videosService.getCards(videoIds, viewer),
      meta: paginationMeta(query, total),
    };
  }

  return {
    async setLiked(viewer, videoId, liked) {
      await videosService.findViewable(videoId, viewer);
      if (liked) await engagement.like(viewer.id, videoId);
      else await engagement.unlike(viewer.id, videoId);
      return { liked, likeCount: await engagement.countLikes(videoId) };
    },

    async setBookmarked(viewer, videoId, bookmarked) {
      await videosService.findViewable(videoId, viewer);
      if (bookmarked) await engagement.bookmark(viewer.id, videoId);
      else await engagement.unbookmark(viewer.id, videoId);
      return { bookmarked };
    },

    async saveProgress(viewer, videoId, positionSeconds) {
      const video = await videosService.findViewable(videoId, viewer);
      const duration = video.durationSeconds ?? 0;
      // Clamp to the video length so a buggy or tampered client cannot store nonsense.
      const position = Math.min(Math.round(positionSeconds), duration);

      return engagement.saveProgress(viewer.id, videoId, {
        positionSeconds: position,
        completed: duration > 0 && position >= duration * COMPLETION_THRESHOLD,
      });
    },

    async listBookmarks(viewer, query) {
      const page = await engagement.findBookmarkedVideoIds(viewer.id, {
        includeHidden: isAdmin(viewer),
        page: pageWindow(query),
      });
      return toCardPage(page, query, viewer);
    },

    async listHistory(viewer, query) {
      const page = await engagement.findHistoryVideoIds(viewer.id, {
        includeHidden: isAdmin(viewer),
        inProgressOnly: query.inProgress,
        page: pageWindow(query),
      });
      return toCardPage(page, query, viewer);
    },

    async removeFromHistory(viewer, videoId) {
      const removed = await engagement.deleteHistoryEntry(viewer.id, videoId);
      if (!removed) throw AppError.notFound('Video is not in your history');
    },

    clearHistory(viewer) {
      return engagement.clearHistory(viewer.id);
    },
  };
}
