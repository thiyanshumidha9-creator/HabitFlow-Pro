/* ============================================
   HabitFlow Pro — Settings Page (Placeholder)
   ============================================ */

import { createCard } from '../components/card.js';
import { createButton } from '../components/button.js';
import { renderIcons } from '../utils/icons.js';
import { themeManager } from '../utils/theme.js';

/**
 * Render the Settings placeholder page.
 * @param {Element} container
 */
export function render(container) {
  const currentTheme = themeManager.current;

  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Customize your HabitFlow Pro experience.</p>
        </div>
      </div>

      <div class="d-flex flex-col gap-6" style="max-width: 640px;">
        ${createCard({
          title: 'Appearance',
          subtitle: 'Theme and display preferences',
          body: `
            <div class="d-flex items-center justify-between">
              <div>
                <div class="text-body fw-medium">Theme</div>
                <div class="text-body-sm">Current: ${currentTheme === 'dark' ? 'Dark' : 'Light'} mode</div>
              </div>
              ${createButton({
                text: currentTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark',
                variant: 'secondary',
                size: 'sm',
                id: 'settings-theme-btn',
                iconLeft: currentTheme === 'dark' ? 'sun' : 'moon',
              })}
            </div>
          `,
        })}

        ${createCard({
          title: 'Account',
          subtitle: 'Profile and authentication',
          body: `
            <div class="empty-state empty-state--compact">
              <div class="empty-state-icon">
                <i data-lucide="user-circle" style="width:100%;height:100%;"></i>
              </div>
              <h3 class="empty-state-title">Coming Soon</h3>
              <p class="empty-state-description">Account management will be available here.</p>
            </div>
          `,
        })}

        ${createCard({
          title: 'Data & Privacy',
          subtitle: 'Export and manage your data',
          body: `
            <div class="empty-state empty-state--compact">
              <div class="empty-state-icon">
                <i data-lucide="shield" style="width:100%;height:100%;"></i>
              </div>
              <h3 class="empty-state-title">Coming Soon</h3>
              <p class="empty-state-description">Data export and privacy controls will appear here.</p>
            </div>
          `,
        })}
      </div>
    </div>
  `;

  renderIcons();

  // Theme toggle button
  const themeBtn = container.querySelector('#settings-theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      themeManager.toggle();
      // Re-render to update the button label
      render(container);
    });
  }
}
