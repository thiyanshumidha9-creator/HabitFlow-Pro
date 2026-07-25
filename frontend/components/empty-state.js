/* ============================================
   HabitFlow Pro — Empty State Component
   ============================================ */

import { createButton } from './button.js';

/**
 * Create an empty state HTML string.
 *
 * @param {Object} options
 * @param {string} [options.icon=''] - Lucide icon name
 * @param {string} [options.title='Nothing here yet'] - Title
 * @param {string} [options.description=''] - Description text
 * @param {string} [options.actionText=''] - CTA button text (if empty, no button)
 * @param {string} [options.actionId=''] - CTA button ID
 * @param {boolean} [options.compact=false] - Use compact variant
 * @returns {string}
 */
export function createEmptyState(options = {}) {
  const {
    icon = '',
    title = 'Nothing here yet',
    description = '',
    actionText = '',
    actionId = '',
    compact = false,
  } = options;

  const compactClass = compact ? 'empty-state--compact' : '';

  const iconHTML = icon ? `
    <div class="empty-state-icon">
      <i data-lucide="${icon}" style="width:100%;height:100%;"></i>
    </div>
  ` : '';

  const actionHTML = actionText ? `
    <div class="empty-state-actions">
      ${createButton({
        text: actionText,
        variant: 'primary',
        size: 'md',
        id: actionId,
        iconLeft: 'plus',
      })}
    </div>
  ` : '';

  return `
    <div class="empty-state ${compactClass}">
      ${iconHTML}
      <h3 class="empty-state-title">${title}</h3>
      ${description ? `<p class="empty-state-description">${description}</p>` : ''}
      ${actionHTML}
    </div>
  `;
}
