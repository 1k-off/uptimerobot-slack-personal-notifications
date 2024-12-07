import NodeCache from 'node-cache';

const cache = new NodeCache();

/**
 * Retrieves cached data for a given key.
 * @param {string} key - The cache key.
 * @returns {any|null} - The cached data or null if not found.
 */
export function getCachedData(key) {
    return cache.get(key) || null;
}

/**
 * Sets cached data for a given key with TTL.
 * @param {string} key - The cache key.
 * @param {any} data - The data to cache.
 * @param {number} ttl - Time to live in seconds.
 */
export function setCachedData(key, data, ttl) {
    cache.set(key, data, ttl);
}

/**
 * (Optional) Removes cached data for a given key.
 * @param {string} key - The cache key.
 */
export function removeCachedData(key) {
    cache.del(key);
}
