import { config } from '../../config.js';
import { createMockProvider } from './mockProvider.js';
import { createGoogleProvider } from './googlePlacesProvider.js';
import { createKvkProvider } from './kvkProvider.js';
import { createOverpassProvider } from './overpassProvider.js';

/**
 * Kiest de actieve bron op basis van config.leadSource.
 * Elke provider levert een async generator `stream({ filters })` van kandidaat-bedrijven.
 */
export function getProvider(source = config.leadSource) {
  switch (source) {
    case 'google':
      return createGoogleProvider();
    case 'kvk':
      return createKvkProvider();
    case 'openstreetmap':
    case 'osm':
      return createOverpassProvider();
    case 'mock':
    default:
      return createMockProvider();
  }
}
