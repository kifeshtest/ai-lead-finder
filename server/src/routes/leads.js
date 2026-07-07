import { Router } from 'express';
import { getStore } from '../db/store.js';
import { parseFilters } from './filters.js';

const router = Router();

// GET /api/leads  → gefilterde lijst met leads
router.get('/', async (req, res) => {
  const store = await getStore();
  const filters = parseFilters(req.query);
  const leads = await store.listLeads(filters);
  res.json({ leads, count: leads.length });
});

export default router;
