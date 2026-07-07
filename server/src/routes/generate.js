import { Router } from 'express';
import { getStore } from '../db/store.js';
import { getQueue } from '../queue/leadQueue.js';
import { runGeneration } from '../services/leadService.js';
import { parseFilters } from './filters.js';
import { config, useRedis } from '../config.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/generate  → start een generatie-run (queue of inline)
router.post('/', async (req, res) => {
  const filters = parseFilters(req.body || {});
  const store = await getStore();
  const runId = await store.createRun({ target: config.leadsPerRun, filters });

  if (useRedis) {
    const queue = getQueue();
    await queue.add('generate', { runId, filters }, { removeOnComplete: 100, removeOnFail: 100 });
  } else {
    // Inline: draai op de achtergrond, niet awaiten. Voortgang via GET /:id.
    runGeneration({ runId, filters, store }).catch(async (err) => {
      logger.error('Generatie mislukt:', err);
      await store.updateRun(runId, { status: 'error', error: err.message, finishedAt: new Date().toISOString() });
    });
  }

  res.status(202).json({ runId, target: config.leadsPerRun, mode: useRedis ? 'queue' : 'inline' });
});

// GET /api/generate/:id  → voortgang/status van een run
router.get('/:id', async (req, res) => {
  const store = await getStore();
  const run = await store.getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run niet gevonden' });
  res.json(run);
});

export default router;
