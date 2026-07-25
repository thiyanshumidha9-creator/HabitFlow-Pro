/* ============================================
   HabitFlow Pro — Sidebar Component
   ============================================ */

import { $, on, toggleClass } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Navigation items configuration.
 * Each item has: id, label, icon (Lucide name), route (hash path), section.
 */
const NAV_ITEMS = [
  { section: 'Main', items: [
    { id: 'dashboard',    label: 'Dashboard',    icon: 'layout-dashboard', route: '/dashboard' },
    { id: 'habits',       label: 'Habits',       icon: 'target',           route: '/habits' },
    { id: 'calendar',     label: 'Calendar',     icon: 'calendar',         route: '/calendar' },
    { id: 'analytics',    label: 'Analytics',    icon: 'bar-chart-3',      route: '/analytics' },
  ]},
  { section: 'Personal', items: [
    { id: 'journal',      label: 'Journal',      icon: 'book-open',        route: '/journal' },
    { id: 'achievements', label: 'Achievements', icon: 'trophy',           route: '/achievements' },
  ]},
  { section: 'System', items: [
    { id: 'settings',     label: 'Settings',     icon: 'settings',         route: '/settings' },
  ]},
];

class Sidebar {
  constructor() {
    this.isCollapsed = false;
    this.isMobileOpen = false;
    this.activeRoute = '/dashboard';
    this._el = null;
    this._overlay = null;
  }

  /**
   * Render the sidebar into the given container.
   * @param {Element} container
   */
  render(container) {
    // Create overlay for mobile
    this._overlay = document.createElement('div');
    this._overlay.className = 'sidebar-overlay';
    this._overlay.id = 'sidebar-overlay';
    on(this._overlay, 'click', () => this.closeMobile());
    document.body.appendChild(this._overlay);

    // Build sidebar HTML
    const sectionsHTML = NAV_ITEMS.map((section) => `
      <div class="sidebar-section">
        <div class="sidebar-section-title">${section.section}</div>
        ${section.items.map((item) => `
          <a href="#${item.route}"
             class="sidebar-nav-item${item.route === this.activeRoute ? ' active' : ''}"
             data-route="${item.route}"
             data-tooltip="${item.label}"
             role="menuitem"
             aria-label="${item.label}">
            <span class="sidebar-nav-item-icon">
              <i data-lucide="${item.icon}"></i>
            </span>
            <span class="sidebar-nav-item-label">${item.label}</span>
          </a>
        `).join('')}
      </div>
    `).join('');

    container.innerHTML = `
      <nav class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">
            <i data-lucide="zap" style="width:20px;height:20px;"></i>
          </div>
          <span class="sidebar-brand-text">HabitFlow</span>
        </div>

        <div class="sidebar-nav" role="menu">
          ${sectionsHTML}
        </div>

        <div class="sidebar-footer">
          <button class="sidebar-collapse-btn" id="sidebar-collapse-btn"
                  aria-label="Toggle sidebar" title="Collapse sidebar">
            <i data-lucide="panel-left-close" style="width:18px;height:18px;"></i>
            <span class="sidebar-collapse-btn-label">Collapse</span>
          </button>
        </div>
      </nav>
    `;

    this._el = $('#sidebar', container);
    this._bindEvents();
    renderIcons();
  }

  /**
   * Set the active route and highlight the corresponding nav item.
   * @param {string} route
   */
  setActive(route) {
    this.activeRoute = route;
    if (!this._el) return;

    // Remove active from all
    this._el.querySelectorAll('.sidebar-nav-item').forEach((item) => {
      item.classList.remove('active');
    });

    // Set active on matching item
    const active = this._el.querySelector(`.sidebar-nav-item[data-route="${route}"]`);
    if (active) {
      active.classList.add('active');
    }

    // Close mobile sidebar on navigation
    if (this.isMobileOpen) {
      this.closeMobile();
    }
  }

  /**
   * Toggle sidebar collapsed state (desktop only).
   */
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    toggleClass(this._el, 'collapsed', this.isCollapsed);

    // Update the collapse button icon
    const btn = $('#sidebar-collapse-btn', this._el);
    if (btn) {
      const iconEl = btn.querySelector('[data-lucide]');
      if (iconEl) {
        iconEl.setAttribute('data-lucide', this.isCollapsed ? 'panel-right-close' : 'panel-left-close');
        renderIcons();
      }
      const label = btn.querySelector('.sidebar-collapse-btn-label');
      if (label) label.textContent = this.isCollapsed ? 'Expand' : 'Collapse';
    }

    // Dispatch custom event so layout can adjust
    window.dispatchEvent(new CustomEvent('sidebar:toggle', {
      detail: { collapsed: this.isCollapsed },
    }));
  }

  /**
   * Open sidebar overlay on mobile.
   */
  openMobile() {
    this.isMobileOpen = true;
    this._el.classList.add('mobile-open');
    this._overlay.classList.add('active');
    document.body.classList.add('modal-open');

    // Focus the first nav item
    const first = this._el.querySelector('.sidebar-nav-item');
    if (first) first.focus();
  }

  /**
   * Close sidebar overlay on mobile.
   */
  closeMobile() {
    this.isMobileOpen = false;
    this._el.classList.remove('mobile-open');
    this._overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  /**
   * Bind DOM events.
   * @private
   */
  _bindEvents() {
    // Collapse toggle
    const collapseBtn = $('#sidebar-collapse-btn', this._el);
    if (collapseBtn) {
      on(collapseBtn, 'click', () => this.toggleCollapse());
    }

    // Keyboard: Escape closes mobile sidebar
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isMobileOpen) {
        this.closeMobile();
      }
    });
  }
}

// Singleton export
export const sidebar = new Sidebar();
