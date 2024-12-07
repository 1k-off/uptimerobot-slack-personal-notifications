let cache = {};

export function getCachedData(key) {
  return cache[key];
}

export function setCachedData(key, data) {
  cache[key] = data;
}
