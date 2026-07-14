import dotenv from 'dotenv';
dotenv.config();

const bool = (v, def = false) =>
  v === undefined ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
const int = (v, def) => (v === undefined || v === '' ? def : parseInt(v, 10));

export const config = {
  port: int(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  leadSource: (process.env.LEAD_SOURCE || 'mock').toLowerCase(),

  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',

  scoreThreshold: int(process.env.SCORE_THRESHOLD, 55),
  leadsPerRun: int(process.env.LEADS_PER_RUN, 50),
  auditConcurrency: int(process.env.AUDIT_CONCURRENCY, 5),
  auditTimeoutMs: int(process.env.AUDIT_TIMEOUT_MS, 15000),
  maxSearchAttempts: int(process.env.MAX_SEARCH_ATTEMPTS, 600),

  enableLighthouse: bool(process.env.ENABLE_LIGHTHOUSE, false),

  enableAI: bool(process.env.ENABLE_AI, false),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'claude-haiku-4-5-20251001',

  kvkApiKey: process.env.KVK_API_KEY || '',
  kvkApiBase: process.env.KVK_API_BASE || 'https://api.kvk.nl/api/v2',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  // Harde limiet op Google Places-verzoeken per generatie (kostenbeheersing).
  maxPlacesRequests: int(process.env.MAX_PLACES_REQUESTS, 40),

  // ── Auth ──
  authUsername: process.env.ADMIN_USERNAME || 'admin',
  authPassword: process.env.ADMIN_PASSWORD || 'changeme',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtTtlHours: int(process.env.JWT_TTL_HOURS, 12),

  // ── PageSpeed Insights ──
  pageSpeedApiKey: process.env.PAGESPEED_API_KEY || '',
  analysisEnabled: bool(process.env.ANALYSIS_ENABLED, true),
  analysisMaxAttempts: int(process.env.ANALYSIS_MAX_ATTEMPTS, 3),
  analysisIntervalMs: int(process.env.ANALYSIS_INTERVAL_MS, 4000),
};

export const usePostgres = Boolean(config.databaseUrl);
export const useRedis = Boolean(config.redisUrl);
