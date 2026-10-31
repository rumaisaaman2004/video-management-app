export function createVideosController({ videosService }) {
  return {
    async upload(req, res) {
      const video = await videosService.upload({
        uploaderId: req.user.id,
        file: req.file,
        metadata: req.validated.body,
      });
      // 202: the upload is stored, but the video becomes playable only after processing.
      res.status(202).json({ data: video });
    },
  };
}
