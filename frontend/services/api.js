/* ============================================
   HabitFlow Pro — API Client
   ============================================
   An HTTP client wrapper around the fetch API that
   automatically handles JWT headers, API errors,
   and automatic refresh token rotation.
   ============================================ */

import { tokenService } from './token-service.js';
import { CONFIG } from '../config.js';

const API_BASE_URL = CONFIG.API_BASE_URL;

// Holds the promise of the active refresh token request to deduplicate calls
let activeRefreshPromise = null;

class ApiClient {
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

      // Handle 401 Unauthorized (Token expired / invalid)
      if (response.status === 401 && !options._isRetry) {
        return await this._handleUnauthorized(endpoint, options);
      }

      return await this._parseResponse(response);
    } catch (error) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      }
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
  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   * @param {string} endpoint
   * @param {Object} body
   * @param {Object} [headers]
   */
  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint
   * @param {Object} [headers]
   */
  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
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
