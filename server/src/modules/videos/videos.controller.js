import { AppError } from '../../errors/AppError.js';
import { isValidSignature } from '../../lib/signedUrls.js';

const ONE_DAY_SECONDS = 24 * 60 * 60;

export function createVideosController({ videosService }) {
  /**
   * Streams a stored file. res.sendFile handles Range requests (seeking),
   * conditional requests (ETag / 304) and HEAD.
   */
  async function sendMedia(req, res, next, { kind, label }) {
    const media = await videosService.getMediaFile({
      videoId: req.validated.params.id,
      kind,
      label,
      viewer: req.user,
      hasValidSignature: isValidSignature(req.baseUrl + req.path, req.query),
    });

    res.sendFile(
      media.filePath,
      {
        cacheControl: false,
        headers: {
          'Cache-Control': media.isPublic
            ? `public, max-age=${ONE_DAY_SECONDS}`
            : 'private, no-store',
        },
      },
      (err) => {
        // Errors after streaming started (e.g. the viewer closed the tab) need no response.
        if (!err || res.headersSent) return;
        next(err.code === 'ENOENT' ? AppError.notFound('File not found') : err);
      },
    );
  }

  return {
    async list(req, res) {
      res.json(await videosService.list(req.validated.query, req.user));
    },

    async getById(req, res) {
      res.json({ data: await videosService.getById(req.validated.params.id, req.user) });
    },

    async upload(req, res) {
      const video = await videosService.upload({
        uploaderId: req.user.id,
        file: req.file,
        metadata: req.validated.body,
      });
      // 202: the upload is stored, but the video becomes playable only after processing.
      res.status(202).json({ data: video });
    },

    async update(req, res) {
      const { params, body } = req.validated;
      res.json({ data: await videosService.update(params.id, body) });
    },

    async delete(req, res) {
      await videosService.delete(req.validated.params.id);
      res.status(204).end();
    },

    async recordView(req, res) {
      await videosService.recordView(req.validated.params.id);
      res.status(204).end();
    },

    async replaceThumbnail(req, res) {
      res.json({ data: await videosService.replaceThumbnail(req.validated.params.id, req.file) });
    },

    async captureThumbnailFrame(req, res) {
      const { params, body } = req.validated;
      res.json({ data: await videosService.captureThumbnailFrame(params.id, body.atSeconds) });
    },

    streamRendition(req, res, next) {
      return sendMedia(req, res, next, { kind: 'rendition', label: req.validated.params.label });
    },

    streamThumbnail(req, res, next) {
      return sendMedia(req, res, next, { kind: 'thumbnail', label: 'default' });
    },
  };
}
