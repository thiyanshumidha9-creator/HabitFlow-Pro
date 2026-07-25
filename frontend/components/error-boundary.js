/* ============================================
   HabitFlow Pro — Error Boundary Component
   ============================================ */

import { createButton } from './button.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render a full-page error boundary.
 *
 * @param {Element} container - Element to render into
 * @param {Object} [options={}]
 * @param {string} [options.title='Something went wrong']
 * @param {string} [options.message='An unexpected error occurred. Please try again.']
 * @param {string} [options.details=''] - Technical error details
 * @param {Function} [options.onRetry] - Retry callback
 */
export function renderErrorBoundary(container, options = {}) {
  const {
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    details = '',
    onRetry = null,
  } = options;

  const detailsHTML = details ? `
    <pre class="error-boundary-details">${details}</pre>
  ` : '';

  container.innerHTML = `
    <div class="error-boundary">
      <div class="error-boundary-icon">
        <i data-lucide="alert-octagon" style="width:100%;height:100%;"></i>
      </div>
      <h2 class="error-boundary-title">${title}</h2>
      <p class="error-boundary-message">${message}</p>
      ${detailsHTML}
      <div class="error-boundary-actions">
        ${createButton({
          text: 'Try Again',
          variant: 'primary',
          id: 'error-retry-btn',
          iconLeft: 'refresh-cw',
        })}
        ${createButton({
          text: 'Go Home',
          variant: 'secondary',
          id: 'error-home-btn',
        })}
      </div>
    </div>
  `;

  renderIcons();

  // Bind retry
  const retryBtn = container.querySelector('#error-retry-btn');
  if (retryBtn && onRetry) {
    retryBtn.addEventListener('click', onRetry);
  }

  // Bind home
  const homeBtn = container.querySelector('#error-home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      window.location.hash = '#/dashboard';
    });
  }
}

/**
 * Create an inline error message.
 *
 * @param {string} message
 * @param {Function} [onRetry]
 * @returns {string}
 */
export function createInlineError(message, onRetry) {
  return `
    <div class="error-inline">
      <span class="error-inline-icon">
        <i data-lucide="alert-circle"></i>
      </span>
      <span class="error-inline-message">${message}</span>
      ${onRetry ? '<button class="error-inline-retry" data-error-retry>Retry</button>' : ''}
    </div>
  `;
}
