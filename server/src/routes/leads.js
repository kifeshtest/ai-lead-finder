import { Router } from 'express';
import { getStore } from '../db/store.js';
import { parseFilters } from './filters.js';

const router = Router();

const STATUSES = ['nieuw', 'te_bellen', 'gebeld', 'geen_gehoor', 'terugbellen', 'gemaild', 'afspraak', 'offerte', 'klant', 'niet_geinteresseerd', 'ongeldig'];

// GET /api/leads  → gefilterde, gesorteerde lijst
router.get('/', async (req, res) => {
  const store = await getStore();
  const filters = parseFilters(req.query);
  const leads = await store.listLeads(filters);
  res.json({ leads, count: leads.length });
});

// PATCH /api/leads/:id  → CRM-velden bijwerken
router.patch('/:id', async (req, res) => {
  const store = await getStore();
  const b = req.body || {};
  const patch = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'Ongeldige status' });
    patch.status = b.status;
  }
  if (b.note !== undefined) patch.note = String(b.note).slice(0, 4000);
  if (b.favorite !== undefined) patch.favorite = !!b.favorite;
  if (b.contactPerson !== undefined) patch.contactPerson = String(b.contactPerson).slice(0, 200);
  if (b.followUpDate !== undefined) patch.followUpDate = b.followUpDate || null;
  if (b.website !== undefined) patch.website = String(b.website).slice(0, 500) || null;
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Niets om bij te werken' });

  let lead = await store.updateLead(req.params.id, patch);
  if (!lead) return res.status(404).json({ error: 'Lead niet gevonden' });
  // Website gecorrigeerd → opnieuw analyseren
  if (b.website !== undefined && lead.hasWebsite) lead = (await store.requeueAnalysis(req.params.id)) || lead;
  res.json({ lead });
});

// POST /api/leads/:id/reanalyze  → website opnieuw analyseren
router.post('/:id/reanalyze', async (req, res) => {
  const store = await getStore();
  const lead = await store.requeueAnalysis(req.params.id);
  if (!lead) return res.status(400).json({ error: 'Lead heeft geen website om te analyseren' });
  res.json({ lead });
});

// DELETE /api/leads/:id  → één lead verwijderen
router.delete('/:id', async (req, res) => {
  const store = await getStore();
  const deleted = await store.deleteLead(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Lead niet gevonden' });
  res.json({ ok: true });
});

// DELETE /api/leads  → alle leads wissen
router.delete('/', async (req, res) => {
  const store = await getStore();
  const deleted = await store.clearLeads();
  res.json({ ok: true, deleted });
});

export default router;
