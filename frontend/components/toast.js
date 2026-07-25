/* ============================================
   HabitFlow Pro — Toast Component
   ============================================ */

import { renderIcons } from '../utils/icons.js';

/** Icon mapping per variant */
const ICONS = {
  success: 'check-circle-2',
  error:   'x-circle',
  warning: 'alert-triangle',
  info:    'info',
};

class ToastManager {
  constructor() {
    this._container = null;
    this._toasts = [];
  }

  /**
   * Initialize the toast system.
   */
  init() {
    if (this._container) return;

    this._container = document.createElement('div');
    this._container.className = 'toast-container';
    this._container.id = 'toast-container';
    this._container.setAttribute('role', 'status');
    this._container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this._container);
  }

  /**
   * Show a toast notification.
   *
   * @param {Object} options
   * @param {string} [options.title=''] - Toast title
   * @param {string} [options.message=''] - Toast message
   * @param {string} [options.variant='info'] - 'success'|'error'|'warning'|'info'
   * @param {number} [options.duration=4000] - Auto-dismiss in ms (0 = manual)
   * @returns {string} Toast ID
   */
  show(options = {}) {
    const {
      title = '',
      message = '',
      variant = 'info',
      duration = 4000,
    } = options;

    const id = `toast-${Date.now()}`;
    const iconName = ICONS[variant] || ICONS.info;

    const html = `
      <div class="toast toast--${variant}" id="${id}" role="alert">
        <span class="toast-icon">
          <i data-lucide="${iconName}"></i>
        </span>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" data-toast-close aria-label="Dismiss notification">
          <i data-lucide="x" style="width:16px;height:16px;"></i>
        </button>
        ${duration > 0 ? `
          <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
        ` : ''}
      </div>
    `;

    this._container.insertAdjacentHTML('beforeend', html);
    renderIcons();

    const el = document.getElementById(id);
    this._toasts.push({ id, el, timer: null });

    // Close button
    const closeBtn = el.querySelector('[data-toast-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(id));
    }

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), duration);
      const entry = this._toasts.find((t) => t.id === id);
      if (entry) entry.timer = timer;
    }

    return id;
  }

  /**
   * Convenience methods.
   */
  success(message, title = 'Success') {
    return this.show({ title, message, variant: 'success' });
  }

  error(message, title = 'Error') {
    return this.show({ title, message, variant: 'error', duration: 6000 });
  }

  warning(message, title = 'Warning') {
    return this.show({ title, message, variant: 'warning' });
  }

  info(message, title = '') {
    return this.show({ title, message, variant: 'info' });
  }

  /**
   * Dismiss a toast by ID.
   * @param {string} id
   */
  dismiss(id) {
    const index = this._toasts.findIndex((t) => t.id === id);
    if (index === -1) return;

    const { el, timer } = this._toasts[index];
    if (timer) clearTimeout(timer);

    el.classList.add('removing');

    setTimeout(() => {
      el.remove();
      this._toasts.splice(index, 1);
    }, 200); // Match fadeOut duration
  }

  /**
   * Dismiss all toasts.
   */
  dismissAll() {
    [...this._toasts].forEach((t) => this.dismiss(t.id));
  }
}

// Singleton export
export const toastManager = new ToastManager();
