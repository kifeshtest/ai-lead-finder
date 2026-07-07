import { usePostgres } from '../config.js';
import { createMemoryStore } from './memoryStore.js';
import { createPgStore } from './pgStore.js';

let store = null;

export async function getStore() {
  if (store) return store;
  store = usePostgres ? createPgStore() : createMemoryStore();
  await store.init();
  return store;
}
