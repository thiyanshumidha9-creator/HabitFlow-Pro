/* ============================================
   HabitFlow Pro — Token Service
   ============================================
   Manages storage and retrieval of JWT tokens.
   Supports session storage vs local storage based on
   "Remember Me" preference.
   ============================================ */

const ACCESS_KEY = 'habitflow_access_token';
const REFRESH_KEY = 'habitflow_refresh_token';
const REMEMBER_KEY = 'habitflow_remember_me';

class TokenService {
  /**
   * Determine the current storage engine based on the remember-me flag.
   * @returns {Storage}
   * @private
   */
  _getStorage() {
    const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';
    return rememberMe ? localStorage : sessionStorage;
  }

  /**
   * Get the saved access token.
   * @returns {string|null}
   */
  getAccessToken() {
    // Check both storages just in case, prioritizing the remember-me determined one
    const primary = this._getStorage().getItem(ACCESS_KEY);
    if (primary) return primary;
    
    return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
  }

  /**
   * Set the access token.
   * @param {string} token
   */
  setAccessToken(token) {
    this._getStorage().setItem(ACCESS_KEY, token);
  }

  /**
   * Get the saved refresh token.
   * @returns {string|null}
   */
  getRefreshToken() {
    const primary = this._getStorage().getItem(REFRESH_KEY);
    if (primary) return primary;

    return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
  }

  /**
   * Set the refresh token.
   * @param {string} token
   */
  setRefreshToken(token) {
    this._getStorage().setItem(REFRESH_KEY, token);
  }

  /**
   * Get the remember me preference.
   * @returns {boolean}
   */
  getRememberMe() {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
  }

  /**
   * Set the remember me preference and move tokens to the correct storage.
   * @param {boolean} value
   */
  setRememberMe(value) {
    const oldAccessToken = this.getAccessToken();
    const oldRefreshToken = this.getRefreshToken();

    // Clear from both storages first
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);

    if (value) {
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    // Write back tokens to new target storage
    if (oldAccessToken) this.setAccessToken(oldAccessToken);
    if (oldRefreshToken) this.setRefreshToken(oldRefreshToken);
  }

  /**
   * Remove all authentication tokens and preferences.
   */
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  }

  /**
   * Parse JWT payload to get token details.
   * @param {string} token
   * @returns {Object|null}
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      // base64 decode (handling browser environments)
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (e) {
      console.warn('[Token Service] Failed to decode token:', e);
      return null;
    }
  }

  /**
   * Check if a token is expired.
   * @param {string} token
   * @returns {boolean}
   */
  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp is in seconds, Date.now() is in ms. Add buffer of 10 seconds.
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < (currentTime + 10);
  }
}

// Singleton export
export const tokenService = new TokenService();
