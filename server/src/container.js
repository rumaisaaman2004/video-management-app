import { createAuthService } from './modules/auth/auth.service.js';
import { createCategoriesService } from './modules/categories/categories.service.js';

/**
 * Composition root: creates each service once and wires it to shared
 * infrastructure. Tests build their own container with test doubles.
 */
export function createContainer({ pool }) {
  return {
    pool,
    authService: createAuthService({ pool }),
    categoriesService: createCategoriesService({ pool }),
  };
}
