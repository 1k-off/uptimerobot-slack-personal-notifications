import NodeCache from 'node-cache';

const cache = new NodeCache();

/**
 * Retrieves cached data for a given key.
 * @param key - The cache key.
 * @returns The cached data or null if not found.
 */
export function getCachedData<T = unknown>(key: string): T | null {
    return cache.get(key) || null;
}

/**
 * Sets cached data for a given key with TTL.
 * @param key - The cache key.
 * @param data - The data to cache.
 * @param ttl - Time to live in seconds.
 */
export function setCachedData<T = unknown>(key: string, data: T, ttl: number): void {
    cache.set(key, data, ttl);
}

/**
 * Removes cached data for a given key.
 * @param key - The cache key.
 */
export function removeCachedData(key: string): void {
    cache.del(key);
} 