/* ============================================
   HabitFlow Pro — Habits Page (Placeholder)
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render the Habits placeholder page.
 * @param {Element} container
 */
export function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Habits</h1>
          <p class="page-subtitle">Create and manage your daily habits.</p>
        </div>
      </div>

      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
            icon: 'target',
            title: 'No habits yet',
            description: 'Start building better routines by creating your first habit. Track daily, weekly, or monthly goals.',
            actionText: 'Create Habit',
            actionId: 'create-habit-btn',
          })}
        </div>
      </div>
    </div>
  `;

  renderIcons();
}
