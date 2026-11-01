export function createCategoriesController({ categoriesService }) {
  return {
    async list(req, res) {
      res.json({ data: await categoriesService.list() });
    },

    async getById(req, res) {
      res.json({ data: await categoriesService.getById(req.validated.params.id) });
    },

    async create(req, res) {
      res.status(201).json({ data: await categoriesService.create(req.validated.body) });
    },

    async update(req, res) {
      const { params, body } = req.validated;
      res.json({ data: await categoriesService.update(params.id, body) });
    },

    async delete(req, res) {
      await categoriesService.delete(req.validated.params.id);
      res.status(204).end();
    },
  };
}
