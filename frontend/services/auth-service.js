/* ============================================
   HabitFlow Pro — Authentication Service
   ============================================
   Manages user login, signup, logout state, and
   synchronizes with the FastAPI auth endpoints.
   ============================================ */

import { api } from './api.js';
import { tokenService } from './token-service.js';

class AuthService {
  constructor() {
    this._currentUser = null;
    this._isInitialized = false;

    // Listen for force logout events from api.js
    window.addEventListener('auth:force-logout', () => {
      this._currentUser = null;
      this._notifyStateChange();
    });
  }

  /**
   * Get the current authenticated user's profile details.
   * @returns {Object|null}
   */
  get currentUser() {
    return this._currentUser;
  }

  /**
   * Check if a user session is active.
   * @returns {boolean}
   */
  get isAuthenticated() {
    return !!this._currentUser;
  }

  /**
   * Authenticate with email and password.
   * @param {string} email
   * @param {string} password
   * @param {boolean} rememberMe
   * @returns {Promise<Object>} The authenticated user profile
   */
  async login(email, password, rememberMe) {
    // Set rememberMe in tokenService first so tokens land in the correct storage
    tokenService.setRememberMe(rememberMe);

    const payload = await api.post('/auth/login', {
      email: email.trim(),
      password,
      device_id: 'web',
    });

    const { user, tokens } = payload.data;
    
    // Save tokens
    tokenService.setAccessToken(tokens.access_token);
    tokenService.setRefreshToken(tokens.refresh_token);

    this._currentUser = user;
    this._notifyStateChange();

    return user;
  }

  /**
   * Register a new user account.
   * @param {string} email
   * @param {string} fullName
   * @param {string} password
   * @returns {Promise<Object>} The newly created user profile
   */
  async signup(email, fullName, password) {
    const payload = await api.post('/auth/signup', {
      email: email.trim(),
      full_name: fullName.trim(),
      password,
    });

    const { user, tokens } = payload.data;

    // Default rememberMe to false during signup, can be adjusted if needed
    tokenService.setRememberMe(false);

    // Save tokens
    tokenService.setAccessToken(tokens.access_token);
    tokenService.setRefreshToken(tokens.refresh_token);

    this._currentUser = user;
    this._notifyStateChange();

    return user;
  }

  async refreshProfile() {
    const payload = await api.get('/auth/me');
    this._currentUser = payload.data.user;
    this._notifyStateChange();
    return this._currentUser;
  }

  async updateProfile(changes) {
    const payload = await api.put('/profile', changes);
    this._currentUser = payload.data.user;
    this._notifyStateChange();
    return this._currentUser;
  }

  async changePassword(currentPassword, newPassword) {
    return api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
  }

  /**
   * Log out the current user session (graceful API notification).
   * @returns {Promise<void>}
   */
  async logout() {
    const refreshToken = tokenService.getRefreshToken();
    
    try {
      if (refreshToken) {
        // Inform the backend to revoke this refresh token (idempotent)
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.warn('[Auth Service] Backend logout failed:', e);
    } finally {
      // Always clear tokens locally and reset user state
      tokenService.clear();
      this._currentUser = null;
      this._notifyStateChange();
    }
  }

  /**
   * Check for an existing session on app startup (Auto-Login).
   * Verifies the stored token against GET /auth/me.
   * @returns {Promise<Object|null>}
   */
  async checkAuth() {
    const token = tokenService.getAccessToken();
    if (!token) {
      this._currentUser = null;
      this._isInitialized = true;
      return null;
    }

    try {
      const payload = await api.get('/auth/me');
      this._currentUser = payload.data.user;
    } catch (e) {
      console.warn('[Auth Service] Automatic session validation failed:', e.message);
      const cachedUser = (() => { try { return JSON.parse(localStorage.getItem('habitflow_cached_user') || 'null'); } catch { return null; } })();
      if (!navigator.onLine && cachedUser) this._currentUser = cachedUser;
      else { this._currentUser = null; tokenService.clear(); }
    } finally {
      this._isInitialized = true;
      this._notifyStateChange();
    }

    return this._currentUser;
  }

  /**
   * Check if service has finished initialization check.
   * @returns {boolean}
   */
  get isInitialized() {
    return this._isInitialized;
  }

  /**
   * Dispatch custom event to notify other modules of auth changes.
   * @private
   */
  _notifyStateChange() {
    if (this._currentUser) localStorage.setItem('habitflow_cached_user', JSON.stringify(this._currentUser));
    else if (navigator.onLine) localStorage.removeItem('habitflow_cached_user');
    const event = new CustomEvent('auth:statechange', {
      detail: {
        isAuthenticated: this.isAuthenticated,
        user: this._currentUser,
      },
    });
    window.dispatchEvent(event);
  }
}

// Singleton export
export const authService = new AuthService();
