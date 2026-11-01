export function createPlaylistsController({ playlistsService }) {
  return {
    async listMine(req, res) {
      res.json({ data: await playlistsService.listMine(req.user) });
    },

    async getById(req, res) {
      res.json({ data: await playlistsService.getById(req.validated.params.id, req.user) });
    },

    async create(req, res) {
      res.status(201).json({ data: await playlistsService.create(req.user, req.validated.body) });
    },

    async update(req, res) {
      const { params, body } = req.validated;
      res.json({ data: await playlistsService.update(params.id, req.user, body) });
    },

    async delete(req, res) {
      await playlistsService.delete(req.validated.params.id, req.user);
      res.status(204).end();
    },

    async addVideo(req, res) {
      const { params, body } = req.validated;
      res.json({ data: await playlistsService.addVideo(params.id, req.user, body.videoId) });
    },

    async removeVideo(req, res) {
      const { id, videoId } = req.validated.params;
      res.json({ data: await playlistsService.removeVideo(id, req.user, videoId) });
    },

    async reorder(req, res) {
      const { params, body } = req.validated;
      res.json({ data: await playlistsService.reorder(params.id, req.user, body.videoIds) });
    },
  };
}
