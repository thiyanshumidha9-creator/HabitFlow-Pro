/* ============================================
   HabitFlow Pro — Top Navigation Component
   ============================================ */

import { $, on } from '../utils/dom.js';
import { themeManager } from '../utils/theme.js';
import { renderIcons } from '../utils/icons.js';

class TopNav {
  constructor() {
    this._el = null;
    this._onHamburgerClick = null;
  }

  /**
   * Render the top navigation bar.
   * @param {Element} container
   * @param {Object} [options={}]
   * @param {Function} [options.onHamburgerClick] - Callback for mobile hamburger
   */
  render(container, options = {}) {
    this._onHamburgerClick = options.onHamburgerClick || null;

    container.innerHTML = `
      <header class="topnav" id="topnav" role="banner">
        <button class="topnav-hamburger" id="topnav-hamburger"
                aria-label="Open navigation menu"
                title="Open menu">
          <i data-lucide="menu" style="width:22px;height:22px;"></i>
        </button>

        <div class="topnav-page-info">
          <h1 class="topnav-title" id="topnav-title">Dashboard</h1>
        </div>

        <div class="topnav-spacer"></div>

        <div class="topnav-actions">
          <button class="theme-toggle" id="theme-toggle"
                  aria-label="Toggle theme"
                  title="Toggle light/dark theme">
            <span class="icon-sun"><i data-lucide="sun" style="width:20px;height:20px;"></i></span>
            <span class="icon-moon"><i data-lucide="moon" style="width:20px;height:20px;"></i></span>
          </button>

          <div class="topnav-avatar" id="topnav-avatar"
               role="button" tabindex="0"
               aria-label="User menu"
               title="User profile">
            U
          </div>
        </div>
      </header>
    `;

    this._el = $('#topnav', container);
    this._bindEvents();
    renderIcons();
  }

  /**
   * Update the displayed page title.
   * @param {string} title
   */
  setTitle(title) {
    const titleEl = $('#topnav-title', this._el);
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Bind DOM events.
   * @private
   */
  _bindEvents() {
    // Hamburger
    const hamburger = $('#topnav-hamburger', this._el);
    if (hamburger && this._onHamburgerClick) {
      on(hamburger, 'click', this._onHamburgerClick);
    }

    // Theme toggle
    const themeToggle = $('#theme-toggle', this._el);
    if (themeToggle) {
      on(themeToggle, 'click', () => {
        themeManager.toggle();
      });
    }
  }
}

// Singleton export
export const topNav = new TopNav();
