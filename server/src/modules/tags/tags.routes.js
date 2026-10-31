import { Router } from 'express';
import { createTagsRepository } from './tags.repository.js';

export function createTagsRouter({ pool }) {
  const router = Router();
  const tags = createTagsRepository(pool);

  // Read-only listing with no business rules, so the route uses the repository directly.
  router.get('/', async (req, res) => {
    res.json({ data: await tags.findAllWithCounts() });
  });

  return router;
}
