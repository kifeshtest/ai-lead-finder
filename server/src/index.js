import express from 'express';
import cors from 'cors';
import { config, useRedis, usePostgres } from './config.js';
import { getStore } from './db/store.js';
import { logger } from './utils/logger.js';
import { requireAuth } from './auth/auth.js';
import authRoutes from './routes/auth.js';
import generateRoutes from './routes/generate.js';
import leadsRoutes from './routes/leads.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/export.js';
import { startAnalyzer } from './services/analysis/analyzer.js';

const app = express();
app.set('trust proxy', 1); // achter Render/Netlify-proxy → correcte IP voor rate limiting
const corsOrigin = config.corsOrigin.includes('*') ? true : config.corsOrigin;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Openbaar
app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    source: config.leadSource,
    storage: usePostgres ? 'postgres' : 'memory',
    queue: useRedis ? 'bullmq' : 'inline',
    auth: true,
    pagespeed: config.pageSpeedApiKey ? 'met-key' : 'zonder-key',
    analysis: config.analysisEnabled,
  })
);
app.use('/api/auth', authRoutes);

// Beveiligd — alles hierachter vereist een geldig token
app.use('/api/generate', requireAuth, generateRoutes);
app.use('/api/leads', requireAuth, leadsRoutes);
app.use('/api/stats', requireAuth, statsRoutes);
app.use('/api/export', requireAuth, exportRoutes);

app.use((err, req, res, next) => {
  logger.error('Onverwachte fout:', err);
  res.status(500).json({ error: err.message || 'Interne serverfout' });
});

async function start() {
  await getStore();
  startAnalyzer(); // achtergrond PageSpeed/website-analyse
  app.listen(config.port, () => {
    logger.info(`API draait op http://localhost:${config.port}`);
    logger.info(`Bron=${config.leadSource} · Opslag=${usePostgres ? 'postgres' : 'memory'} · PageSpeed=${config.pageSpeedApiKey ? 'key' : 'geen key'} · Auth=aan`);
  });
}

start().catch((err) => {
  logger.error('Kon server niet starten:', err);
  process.exit(1);
});
