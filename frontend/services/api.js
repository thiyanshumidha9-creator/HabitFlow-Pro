/* ============================================
   HabitFlow Pro — API Client
   ============================================
   An HTTP client wrapper around the fetch API that
   automatically handles JWT headers, API errors,
   and automatic refresh token rotation.
   ============================================ */

import { tokenService } from './token-service.js';
import { CONFIG } from '../config.js';
import { offlineService } from './offline-service.js';

const API_BASE_URL = CONFIG.API_BASE_URL;

// Holds the promise of the active refresh token request to deduplicate calls
let activeRefreshPromise = null;

class ApiClient {
  constructor() {
    this._cache = new Map();
    this._inflightGets = new Map();
    this._cacheTtl = 15000;
  }

  invalidateAnalyticsCache() {
    for (const key of this._cache.keys()) {
      if (key.startsWith('/analytics/') || key.startsWith('/dashboard/')) this._cache.delete(key);
    }
  }

  clearCache() { this._cache.clear(); }

  peek(endpoint) {
    return this._cache.get(endpoint)?.value || offlineService.getCached(endpoint) || null;
  }

  setCached(endpoint, value) {
    this._cache.set(endpoint, { value, timestamp: Date.now() });
    // request() already updates the persistent offline cache.
    return value;
  }

  invalidate(endpoint) {
    this._cache.delete(endpoint);
    offlineService.invalidate(endpoint);
  }

  _invalidateForMutation(endpoint) {
    if (endpoint.startsWith('/habits')) this.invalidate('/habits');
    if (endpoint.startsWith('/journals')) this.invalidate('/journals');
    this.invalidateAnalyticsCache();
  }

  syncOfflineChanges() { return offlineService.sync((endpoint, options) => this.request(endpoint, options)); }

  /** Cached GET for read-heavy dashboard and analytics views. */
  async getCached(endpoint, ttl = this._cacheTtl) {
    const cached = this._cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < ttl) return cached.value;
    if (this._inflightGets.has(endpoint)) return this._inflightGets.get(endpoint);

    const request = this.get(endpoint)
      .then(value => this.setCached(endpoint, value))
      .finally(() => this._inflightGets.delete(endpoint));
    this._inflightGets.set(endpoint, request);
    return request;
  }

  async refreshCached(endpoint) {
    if (this._inflightGets.has(endpoint)) return this._inflightGets.get(endpoint);
    const request = this.get(endpoint)
      .then(value => this.setCached(endpoint, value))
      .finally(() => this._inflightGets.delete(endpoint));
    this._inflightGets.set(endpoint, request);
    return request;
  }

  /**
   * Performs an HTTP request.
   * @param {string} endpoint - Relative path (e.g. '/auth/login')
   * @param {Object} [options={}] - Custom fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Setup headers
    options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Attach access token if present
    const token = tokenService.getAccessToken();
    if (token && !options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, options);

      // Auth endpoints return 401 for bad credentials, not expired tokens —
      // they must never enter the refresh-token / force-logout flow.
      const isAuthEndpoint = endpoint.startsWith('/auth/');

      // Handle 401 Unauthorized (Token expired / invalid)
      if (response.status === 401 && !options._isRetry && !isAuthEndpoint) {
        return await this._handleUnauthorized(endpoint, options);
      }

      const parsed = await this._parseResponse(response);
      if ((options.method || 'GET') === 'GET' && !endpoint.startsWith('/auth/')) {
        offlineService.cacheGet(endpoint, parsed);
      }
      return parsed;
    } catch (error) {
      const isNetworkError = error.name === 'TypeError' || error.status === 503 || !navigator.onLine;
      if (isNetworkError && (options.method || 'GET') === 'GET') {
        const cached = offlineService.getCached(endpoint);
        if (cached) return cached;
      }
      if (isNetworkError && options.method && options.method !== 'GET' && !options._skipOffline && !endpoint.startsWith('/auth/') && !endpoint.startsWith('/data/restore')) {
        offlineService.enqueue(endpoint, options);
        return { success: true, message: 'Change saved offline and queued for sync.', offline: true, data: null };
      }
      if (isNetworkError) throw new Error('Network error: You are offline and no cached data is available.');
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint
   * @param {Object} [headers]
   */
  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  /**
   * POST request
   * @param {string} endpoint
   * @param {Object} body
   * @param {Object} [headers]
   */
  async post(endpoint, body, headers = {}) {
    const value = await this.request(endpoint, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    this._invalidateForMutation(endpoint);
    return value;
  }

  /**
   * PUT request
   * @param {string} endpoint
   * @param {Object} body
   * @param {Object} [headers]
   */
  async put(endpoint, body, headers = {}) {
    const value = await this.request(endpoint, {
      method: 'PUT', headers, body: JSON.stringify(body),
    });
    this._invalidateForMutation(endpoint);
    return value;
  }

  /**
   * DELETE request
   * @param {string} endpoint
   * @param {Object} [headers]
   */
  async delete(endpoint, headers = {}) {
    const value = await this.request(endpoint, { method: 'DELETE', headers });
    this._invalidateForMutation(endpoint);
    return value;
  }

  /**
   * Parses the response body, handling success envelopes and API errors.
   * @param {Response} response
   * @private
   */
  async _parseResponse(response) {
    let body = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    }

    if (!response.ok) {
      // Check for standard error envelope from backend
      const errorMessage = body?.message || `Server responded with status ${response.status}`;
      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      apiError.errors = body?.errors || [];
      throw apiError;
    }

    // Return the response data inside the envelope if it follows HF API Response format
    return body;
  }

  /**
   * Attempt token refresh and retry request
   * @private
   */
  async _handleUnauthorized(endpoint, options) {
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) {
      this._forceLogout();
      throw new Error('Session expired. Please log in again.');
    }

    try {
      // Deduplicate refresh token calls
      if (!activeRefreshPromise) {
        activeRefreshPromise = this._refreshTokens(refreshToken);
      }
      
      const newTokens = await activeRefreshPromise;
      activeRefreshPromise = null;

      // Retry original request with the new token
      options._isRetry = true;
      options.headers['Authorization'] = `Bearer ${newTokens.access_token}`;
      return await this.request(endpoint, options);
    } catch (refreshError) {
      activeRefreshPromise = null;
      this._forceLogout();
      throw new Error('Session expired. Please log in again.');
    }
  }

  /**
   * Refresh Token Endpoint Call
   * @private
   */
  async _refreshTokens(refreshToken) {
    const url = `${API_BASE_URL}/auth/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        device_id: 'web'
      }),
    });

    if (!response.ok) {
      throw new Error('Refresh token invalid or expired');
    }

    const payload = await response.json();
    const tokens = payload.data.tokens;
    
    tokenService.setAccessToken(tokens.access_token);
    tokenService.setRefreshToken(tokens.refresh_token);
    
    return tokens;
  }

  /**
   * Clear auth data and navigate to login page.
   * @private
   */
  _forceLogout() {
    tokenService.clear();
    // Dispatch global event so auth-service and router can react
    window.dispatchEvent(new CustomEvent('auth:force-logout'));
    window.location.hash = '#/login';
  }
}

// Singleton export
export const api = new ApiClient();
