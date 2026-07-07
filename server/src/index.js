import express from 'express';
import cors from 'cors';
import { config, useRedis, usePostgres } from './config.js';
import { getStore } from './db/store.js';
import { logger } from './utils/logger.js';
import generateRoutes from './routes/generate.js';
import leadsRoutes from './routes/leads.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/export.js';

const app = express();
// CORS_ORIGIN="*" → sta elke origin toe (handig voor demo). Anders: whitelist uit config.
const corsOrigin = config.corsOrigin.includes('*') ? true : config.corsOrigin;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    source: config.leadSource,
    storage: usePostgres ? 'postgres' : 'memory',
    queue: useRedis ? 'bullmq' : 'inline',
    ai: config.enableAI ? config.aiModel : 'template',
    lighthouse: config.enableLighthouse,
  })
);

app.use('/api/generate', generateRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  logger.error('Onverwachte fout:', err);
  res.status(500).json({ error: err.message || 'Interne serverfout' });
});

async function start() {
  await getStore(); // init opslag (en fail-fast bij verkeerde DB-config)
  app.listen(config.port, () => {
    logger.info(`API draait op http://localhost:${config.port}`);
    logger.info(`Bron=${config.leadSource} · Opslag=${usePostgres ? 'postgres' : 'memory'} · Queue=${useRedis ? 'bullmq' : 'inline'} · AI=${config.enableAI ? config.aiModel : 'template'}`);
  });
}

start().catch((err) => {
  logger.error('Kon server niet starten:', err);
  process.exit(1);
});
