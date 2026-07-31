/* HabitFlow Pro — local API cache and offline mutation queue. */
const CACHE_KEY = 'habitflow_api_cache';
const QUEUE_KEY = 'habitflow_offline_queue';

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

class OfflineService {
  constructor() {
    this._cache = null;
    this._persistPending = false;
    // Warm the persistent cache once while the browser is idle instead of
    // parsing the complete cache during every API response and lookup.
    const warm = () => this._getCache();
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm);
    else setTimeout(warm, 0);
  }
  _getCache() {
    if (!this._cache) this._cache = read(CACHE_KEY, {});
    return this._cache;
  }
  _schedulePersist() {
    if (this._persistPending) return;
    this._persistPending = true;
    const persist = () => {
      this._persistPending = false;
      write(CACHE_KEY, this._getCache());
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(persist, { timeout: 2000 });
    else setTimeout(persist, 0);
  }
  cacheGet(endpoint, payload) {
    this._getCache()[endpoint] = { payload, savedAt: new Date().toISOString() };
    this._schedulePersist();
  }
  getCached(endpoint) { return this._getCache()[endpoint]?.payload || null; }
  invalidate(endpoint) {
    delete this._getCache()[endpoint];
    this._schedulePersist();
  }
  enqueue(endpoint, options) {
    const queue = read(QUEUE_KEY, []);
    const operation = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, endpoint, method: options.method, body: options.body || null, queuedAt: new Date().toISOString() };
    queue.push(operation); write(QUEUE_KEY, queue); return operation;
  }
  get queueLength() { return read(QUEUE_KEY, []).length; }
  async sync(request) {
    if (!navigator.onLine) return { synced: 0, remaining: this.queueLength };
    const queue = read(QUEUE_KEY, []); let synced = 0;
    for (const operation of [...queue]) {
      try {
        await request(operation.endpoint, { method: operation.method, body: operation.body, _skipOffline: true });
        queue.shift(); write(QUEUE_KEY, queue); synced += 1;
      } catch (error) {
        if (!error.status || error.status >= 500) break;
        // Invalid/conflicting queued mutations are removed so they cannot block later changes.
        queue.shift(); write(QUEUE_KEY, queue);
        window.dispatchEvent(new CustomEvent('offline:sync-error', { detail: { operation, error } }));
      }
    }
    return { synced, remaining: queue.length };
  }
  clearDataCache() { this._cache = {}; localStorage.removeItem(CACHE_KEY); }
  clearAll() { this._cache = {}; localStorage.removeItem(CACHE_KEY); localStorage.removeItem(QUEUE_KEY); }
}
export const offlineService = new OfflineService();
