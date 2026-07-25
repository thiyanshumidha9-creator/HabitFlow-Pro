/* ============================================
   HabitFlow Pro — Dashboard Page (Placeholder)
   ============================================ */

import { createCard } from '../components/card.js';
import { renderIcons } from '../utils/icons.js';

/**
 * Render the Dashboard placeholder page.
 * @param {Element} container
 */
export function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back! Here's your overview.</p>
        </div>
      </div>

      <div class="grid-auto-fill">
        ${createCard({
          variant: 'elevated',
          title: 'Today\'s Progress',
          subtitle: 'Track your daily habits',
          body: `
            <div class="empty-state empty-state--compact">
              <div class="empty-state-icon">
                <i data-lucide="trending-up" style="width:100%;height:100%;"></i>
              </div>
              <h3 class="empty-state-title">Coming Soon</h3>
              <p class="empty-state-description">Daily progress tracking will appear here.</p>
            </div>
          `,
        })}

        ${createCard({
          variant: 'elevated',
          title: 'Active Streaks',
          subtitle: 'Keep the momentum going',
          body: `
            <div class="empty-state empty-state--compact">
              <div class="empty-state-icon">
                <i data-lucide="flame" style="width:100%;height:100%;"></i>
              </div>
              <h3 class="empty-state-title">Coming Soon</h3>
              <p class="empty-state-description">Your habit streaks will be displayed here.</p>
            </div>
          `,
        })}

        ${createCard({
          variant: 'elevated',
          title: 'Weekly Summary',
          subtitle: 'Your 7-day overview',
          body: `
            <div class="empty-state empty-state--compact">
              <div class="empty-state-icon">
                <i data-lucide="bar-chart-3" style="width:100%;height:100%;"></i>
              </div>
              <h3 class="empty-state-title">Coming Soon</h3>
              <p class="empty-state-description">Weekly analytics chart will render here.</p>
            </div>
          `,
        })}

        ${createCard({
          variant: 'elevated',
          title: 'Recent Journal',
          subtitle: 'Latest reflections',
          body: `
            <div class="empty-state empty-state--compact">
              <div class="empty-state-icon">
                <i data-lucide="book-open" style="width:100%;height:100%;"></i>
              </div>
              <h3 class="empty-state-title">Coming Soon</h3>
              <p class="empty-state-description">Journal entries will show here.</p>
            </div>
          `,
        })}
      </div>
    </div>
  `;

  renderIcons();
}
