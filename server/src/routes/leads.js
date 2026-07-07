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

// PATCH /api/leads/:id  → status afvinken en/of notitie opslaan
router.patch('/:id', async (req, res) => {
  const store = await getStore();
  const patch = {};
  const { status, note } = req.body || {};
  if (status !== undefined) {
    if (!['nieuw', 'afgehandeld'].includes(status)) return res.status(400).json({ error: 'Ongeldige status' });
    patch.status = status;
  }
  if (note !== undefined) patch.note = String(note).slice(0, 2000);
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Niets om bij te werken' });
  const lead = await store.updateLead(req.params.id, patch);
  if (!lead) return res.status(404).json({ error: 'Lead niet gevonden' });
  res.json({ lead });
});

export default router;
