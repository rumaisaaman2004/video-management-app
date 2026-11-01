export function createEngagementController({ engagementService }) {
  const videoId = (req) => req.validated.params.id;

  return {
    async like(req, res) {
      res.json({ data: await engagementService.setLiked(req.user, videoId(req), true) });
    },

    async unlike(req, res) {
      res.json({ data: await engagementService.setLiked(req.user, videoId(req), false) });
    },

    async bookmark(req, res) {
      res.json({ data: await engagementService.setBookmarked(req.user, videoId(req), true) });
    },

    async unbookmark(req, res) {
      res.json({ data: await engagementService.setBookmarked(req.user, videoId(req), false) });
    },

    async saveProgress(req, res) {
      const { positionSeconds } = req.validated.body;
      res.json({
        data: await engagementService.saveProgress(req.user, videoId(req), positionSeconds),
      });
    },

    async listBookmarks(req, res) {
      res.json(await engagementService.listBookmarks(req.user, req.validated.query));
    },

    async listHistory(req, res) {
      res.json(await engagementService.listHistory(req.user, req.validated.query));
    },

    async removeFromHistory(req, res) {
      await engagementService.removeFromHistory(req.user, videoId(req));
      res.status(204).end();
    },

    async clearHistory(req, res) {
      await engagementService.clearHistory(req.user);
      res.status(204).end();
    },
  };
}
