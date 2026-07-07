import { Queue } from 'bullmq';
import { useRedis } from '../config.js';
import { getConnection } from './connection.js';

export const QUEUE_NAME = 'lead-generation';

let queue = null;

export function getQueue() {
  if (!useRedis) return null;
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  return queue;
}
