import { Router } from 'express';
import { AppError } from '../../errors/AppError.js';

export function createHealthRouter({ pool }) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      req.log.error({ err }, 'Database health check failed');
      throw AppError.serviceUnavailable('Database is unavailable');
    }

    res.json({ data: { status: 'ok', database: 'up' } });
  });

  return router;
}
