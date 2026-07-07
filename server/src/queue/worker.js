import { Worker } from 'bullmq';
import { QUEUE_NAME } from './leadQueue.js';
import { getConnection } from './connection.js';
import { getStore } from '../db/store.js';
import { runGeneration } from '../services/leadService.js';
import { useRedis, usePostgres } from '../config.js';
import { logger } from '../utils/logger.js';

async function main() {
  if (!useRedis) {
    logger.error('Geen REDIS_URL ingesteld — in inline-modus is een aparte worker niet nodig.');
    process.exit(1);
  }
  if (!usePostgres) {
    logger.warn('Queue-modus zonder DATABASE_URL: run-status en leads worden niet gedeeld met de API. Zet DATABASE_URL.');
  }
  const store = await getStore();
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { runId, filters } = job.data;
      return runGeneration({ runId, filters, store });
    },
    { connection: getConnection(), concurrency: 1 }
  );
  worker.on('failed', (job, err) => logger.error(`Job ${job?.id} mislukt:`, err.message));
  worker.on('completed', (job) => logger.info(`Job ${job.id} voltooid.`));
  logger.info('BullMQ-worker gestart. Wacht op generatie-jobs...');
}

main();
