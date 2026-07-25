/* ============================================
   HabitFlow Pro — Theme Manager
   ============================================
   Handles light/dark theme switching with
   localStorage persistence and system pref
   detection.
   ============================================ */

const STORAGE_KEY = 'habitflow-theme';
const ATTRIBUTE = 'data-theme';

class ThemeManager {
  constructor() {
    this._listeners = [];
  }

  /**
   * Initialize the theme system.
   * Reads saved preference → system preference → defaults to 'light'.
   */
  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (systemDark ? 'dark' : 'light');

    this._apply(theme);

    // Listen for OS-level theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        this._apply(e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Get the current theme.
   * @returns {'light'|'dark'}
   */
  get current() {
    return document.documentElement.getAttribute(ATTRIBUTE) || 'light';
  }

  /**
   * Toggle between light and dark.
   */
  toggle() {
    const next = this.current === 'dark' ? 'light' : 'dark';
    this.set(next);
  }

  /**
   * Set a specific theme.
   * @param {'light'|'dark'} theme
   */
  set(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    this._apply(theme);
  }

  /**
   * Register a callback for theme changes.
   * @param {Function} fn - Receives the new theme name
   */
  onChange(fn) {
    this._listeners.push(fn);
  }

  /**
   * Apply theme to the DOM and notify listeners.
   * @param {string} theme
   * @private
   */
  _apply(theme) {
    document.documentElement.setAttribute(ATTRIBUTE, theme);

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'dark' ? '#171717' : '#ffffff';
    }

    this._listeners.forEach((fn) => fn(theme));
  }
}

// Singleton export
export const themeManager = new ThemeManager();
