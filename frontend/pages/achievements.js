/* ============================================
   HabitFlow Pro — Achievements Page (Placeholder)
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render the Achievements placeholder page.
 * @param {Element} container
 */
export function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Achievements</h1>
          <p class="page-subtitle">Celebrate your milestones and badges.</p>
        </div>
      </div>

      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
            icon: 'trophy',
            title: 'No achievements yet',
            description: 'Complete habits consistently to unlock badges and milestones. Start your first streak today!',
          })}
        </div>
      </div>
    </div>
  `;

  renderIcons();
}
