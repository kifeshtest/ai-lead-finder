import IORedis from 'ioredis';
import { config, useRedis } from '../config.js';

let connection = null;

export function getConnection() {
  if (!useRedis) return null;
  if (!connection) connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  return connection;
}
