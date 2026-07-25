/* ============================================
   HabitFlow Pro — Calendar Page (Placeholder)
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render the Calendar placeholder page.
 * @param {Element} container
 */
export function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Calendar</h1>
          <p class="page-subtitle">Visualize your habit completions over time.</p>
        </div>
      </div>

      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
            icon: 'calendar',
            title: 'Calendar view coming soon',
            description: 'A beautiful calendar powered by FullCalendar will show your habit completion history here.',
          })}
        </div>
      </div>
    </div>
  `;

  renderIcons();
}
