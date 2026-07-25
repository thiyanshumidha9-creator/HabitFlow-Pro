/* ============================================
   HabitFlow Pro — Journal Page (Placeholder)
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render the Journal placeholder page.
 * @param {Element} container
 */
export function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Journal</h1>
          <p class="page-subtitle">Reflect on your journey and track your thoughts.</p>
        </div>
      </div>

      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
            icon: 'book-open',
            title: 'Your journal is empty',
            description: 'Write daily reflections to complement your habit tracking. Capture wins, struggles, and insights.',
            actionText: 'New Entry',
            actionId: 'new-journal-btn',
          })}
        </div>
      </div>
    </div>
  `;

  renderIcons();
}
