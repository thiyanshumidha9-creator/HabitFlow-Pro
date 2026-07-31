/* ============================================
   HabitFlow Pro — Modal Component
   ============================================ */

import { $, on, off } from '../utils/dom.js';
import { renderIcons } from '../utils/icons.js';

class ModalManager {
  constructor() {
    this._stack = [];
    this._container = null;
  }

  /**
   * Initialize the modal system.
   * Creates a container for modals in the DOM.
   */
  init() {
    if (this._container) return;

    this._container = document.createElement('div');
    this._container.id = 'modal-root';
    document.body.appendChild(this._container);
  }

  /**
   * Open a modal.
   *
   * @param {Object} options
   * @param {string} [options.title=''] - Modal title
   * @param {string} [options.body=''] - Modal body HTML
   * @param {string} [options.footer=''] - Modal footer HTML (buttons etc.)
   * @param {string} [options.size=''] - ''|'sm'|'lg'|'xl'|'full'
   * @param {boolean} [options.closable=true] - Whether ESC/backdrop closes it
   * @param {Function} [options.onClose] - Callback when modal closes
   * @returns {string} Modal ID for reference
   */
  open(options = {}) {
    if (!this._container || !document.body.contains(this._container)) {
      this._container = document.getElementById('modal-root');
      if (!this._container) {
        this.init();
      }
    }

    const {
      title = '',
      body = '',
      footer = '',
      size = '',
      closable = true,
      onClose = null,
    } = options;

    const id = `modal-${Date.now()}`;
    const sizeClass = size ? `modal--${size}` : '';

    const html = `
      <div class="modal-backdrop" id="${id}" data-closable="${closable}">
        <div class="modal ${sizeClass}" role="dialog" aria-modal="true"
             aria-labelledby="${id}-title">
          ${title ? `
            <div class="modal-header">
              <h2 class="modal-title" id="${id}-title">${title}</h2>
              ${closable ? `
                <button class="modal-close" data-modal-close aria-label="Close modal">
                  <i data-lucide="x" style="width:18px;height:18px;"></i>
                </button>
              ` : ''}
            </div>
          ` : ''}
          ${body ? `<div class="modal-body">${body}</div>` : ''}
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>
    `;

    this._container.insertAdjacentHTML('beforeend', html);
    renderIcons();

    const backdrop = $(`#${id}`, this._container);
    const modal = { id, backdrop, closable, onClose };
    this._stack.push(modal);

    // Animate in
    requestAnimationFrame(() => {
      backdrop.classList.add('active');
    });

    document.body.classList.add('modal-open');

    // Bind close events
    if (closable) {
      on(backdrop, 'click', (e) => {
        if (e.target === backdrop) this.close(id);
      });

      backdrop.querySelectorAll('[data-modal-close]').forEach((btn) => {
        on(btn, 'click', () => this.close(id));
      });
    }

    // Focus trap
    this._trapFocus(backdrop);

    return id;
  }

  /**
   * Close a modal by ID. If no ID, closes the topmost.
   * @param {string} [id]
   */
  close(id) {
    const index = id
      ? this._stack.findIndex((m) => m.id === id)
      : this._stack.length - 1;

    if (index === -1) return;

    const modal = this._stack[index];
    const backdrop = modal.backdrop;

    // Animate out
    backdrop.classList.remove('active');

    setTimeout(() => {
      backdrop.remove();
      this._stack.splice(index, 1);

      if (this._stack.length === 0) {
        document.body.classList.remove('modal-open');
      }

      if (modal.onClose) modal.onClose();
    }, 200); // Match --duration-base
  }

  /**
   * Close all open modals.
   */
  closeAll() {
    [...this._stack].reverse().forEach((m) => this.close(m.id));
  }

  /**
   * Trap keyboard focus within a modal.
   * @param {Element} container
   * @private
   */
  _trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (first) first.focus();

    const handler = (e) => {
      if (e.key === 'Escape') {
        const top = this._stack[this._stack.length - 1];
        if (top && top.closable) this.close(top.id);
        return;
      }

      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    on(container, 'keydown', handler);
  }
}

// Singleton export
export const modalManager = new ModalManager();
