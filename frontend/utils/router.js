/* ============================================
   HabitFlow Pro — SPA Router
   ============================================
   Lightweight hash-based router for single-page
   navigation. Each route maps to a page module.
   ============================================ */

class Router {
  constructor() {
    /** @type {Map<string, {load: Function, title: string}>} */
    this._routes = new Map();
    this._currentRoute = null;
    this._onChangeCallbacks = [];
    this._defaultRoute = '/dashboard';
  }

  /**
   * Register a route.
   * @param {string} path - Hash path (e.g., '/dashboard')
   * @param {Object} handler
   * @param {Function} handler.load - Async function that returns rendered HTML or mounts to container
   * @param {string} handler.title - Page title
   */
  register(path, handler) {
    this._routes.set(path, handler);
    return this;
  }

  /**
   * Set the default/fallback route.
   * @param {string} path
   */
  setDefault(path) {
    this._defaultRoute = path;
    return this;
  }

  /**
   * Subscribe to route changes.
   * @param {Function} fn - Receives { path, title, params }
   */
  onChange(fn) {
    this._onChangeCallbacks.push(fn);
    return this;
  }

  /**
   * Start listening for hash changes.
   */
  start() {
    window.addEventListener('hashchange', () => this._handleRoute());
    // Handle initial load
    this._handleRoute();
  }

  /**
   * Navigate to a route programmatically.
   * @param {string} path
   */
  navigate(path) {
    if (this._parsePath() === path && this._currentRoute === path) return;
    window.location.hash = `#${path}`;
  }

  /**
   * Get the current route path.
   * @returns {string}
   */
  get currentPath() {
    return this._currentRoute;
  }

  /**
   * Parse the current hash into a path.
   * @returns {string}
   * @private
   */
  _parsePath() {
    const hash = window.location.hash.slice(1) || this._defaultRoute;
    // Remove query string if any
    return hash.split('?')[0];
  }

  /**
   * Handle a route change.
   * @private
   */
  async _handleRoute() {
    const path = this._parsePath();
    const route = this._routes.get(path);

    if (!route) {
      // Redirect to default if route not found
      this.navigate(this._defaultRoute);
      return;
    }

    this._currentRoute = path;

    // Update document title
    document.title = `${route.title} — HabitFlow Pro`;

    // Notify subscribers
    const detail = { path, title: route.title };
    this._onChangeCallbacks.forEach((fn) => fn(detail));

    // Load the page
    try {
      await route.load();
    } catch (err) {
      console.error(`[Router] Failed to load route "${path}":`, err);
    }
  }
}

// Singleton export
export const router = new Router();
