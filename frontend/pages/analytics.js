/* ============================================
   HabitFlow Pro — Analytics Page (Placeholder)
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render the Analytics placeholder page.
 * @param {Element} container
 */
export function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Analytics</h1>
          <p class="page-subtitle">Deep insights into your habit performance.</p>
        </div>
      </div>

      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
            icon: 'bar-chart-3',
            title: 'Analytics coming soon',
            description: 'Interactive charts powered by Chart.js will display your streaks, completion rates, and trends.',
          })}
        </div>
      </div>
    </div>
  `;

  renderIcons();
}
