import { Router } from 'express';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import { createCategoriesController } from './categories.controller.js';
import { createCategorySchema, updateCategorySchema } from './categories.schemas.js';

export function createCategoriesRouter({ categoriesService }) {
  const router = Router();
  const controller = createCategoriesController({ categoriesService });
  const adminOnly = [authenticate, authorize('admin')];

  router.get('/', controller.list);
  router.get('/:id', validate({ params: idParamsSchema }), controller.getById);

  router.post('/', adminOnly, validate({ body: createCategorySchema }), controller.create);
  router.patch(
    '/:id',
    adminOnly,
    validate({ params: idParamsSchema, body: updateCategorySchema }),
    controller.update,
  );
  router.delete('/:id', adminOnly, validate({ params: idParamsSchema }), controller.delete);

  return router;
}
