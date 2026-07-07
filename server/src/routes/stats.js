import { Router } from 'express';
import { getStore } from '../db/store.js';
import { config } from '../config.js';

const router = Router();

// GET /api/stats  → dashboard-kerncijfers
router.get('/', async (req, res) => {
  const store = await getStore();
  const stats = await store.stats();
  res.json({ ...stats, scoreThreshold: config.scoreThreshold });
});

export default router;
