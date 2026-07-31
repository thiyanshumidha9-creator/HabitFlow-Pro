/* ============================================
   HabitFlow Pro — Application Bootstrapper
   ============================================ */

import { router } from './utils/router.js';
import { themeManager } from './utils/theme.js';
import { modalManager } from './components/modal.js';
import { toastManager } from './components/toast.js';
import { appLayout } from './layouts/app-layout.js';
import { authService } from './services/auth-service.js';
import { api } from './services/api.js';
import { settingsService, PROFILE_PICTURE_KEY } from './services/settings-service.js';

// Import pages
import * as loginPage from './pages/login.js';
import * as signupPage from './pages/signup.js';
import * as forgotPasswordPage from './pages/forgot-password.js';
import * as resetPasswordPage from './pages/reset-password.js';
import * as dashboardPage from './pages/dashboard.js';
import * as habitsPage from './pages/habits.js';
import * as calendarPage from './pages/calendar.js';
import * as analyticsPage from './pages/analytics.js';
import * as journalPage from './pages/journal.js';
import * as achievementsPage from './pages/achievements.js';
import * as settingsPage from './pages/settings.js';
import * as profilePage from './pages/profile.js';

// PWA installation helper
let deferredPrompt = null;

// Initialize app
async function init() {
  console.log('[HabitFlow] Bootstrapping UI foundation...');

  // 1. Initialize core utilities
  themeManager.init();
  modalManager.init();
  toastManager.init();

  // 2. Mount layout shell to the DOM root
  const root = document.getElementById('app');
  if (!root) {
    console.error('App container #app not found in the DOM.');
    return;
  }
  appLayout.mount(root);

  // 3. Auto-Login/Check Auth session
  await authService.checkAuth();

  // 4. Register pages with SPA router
  const contentContainer = appLayout.getContentContainer();

  // Guard wrappers
  const syncTopnavAvatar = () => {
    const avatar = document.getElementById('topnav-avatar');
    const user = authService.currentUser;
    if (!avatar || !user) return;
    const picture = localStorage.getItem(PROFILE_PICTURE_KEY);
    avatar.innerHTML = picture
      ? `<img src="${picture}" alt="${(user.full_name || 'Member').replace(/[&<>\"]/g, '')} profile picture">`
      : (user.full_name || 'U').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  };

  const guardProtected = (title, renderFn) => ({
    title,
    load: () => {
      if (!authService.isAuthenticated) {
        router.navigate('/login');
      } else {
        appLayout.setAuthMode(false);
        renderFn(contentContainer);
        // Keep the compact top navigation avatar synchronized with Profile.
        syncTopnavAvatar();
      }
    }
  });

  const guardPublic = (title, renderFn) => ({
    title,
    load: () => {
      if (authService.isAuthenticated) {
        router.navigate('/dashboard');
      } else {
        appLayout.setAuthMode(true);
        renderFn(contentContainer);
      }
    }
  });

  router
    .register('/login', guardPublic('Sign In', loginPage.render))
    .register('/signup', guardPublic('Create Account', signupPage.render))
    .register('/forgot-password', guardPublic('Forgot Password', forgotPasswordPage.render))
    .register('/reset-password', guardPublic('Reset Password', resetPasswordPage.render))
    
    .register('/dashboard', guardProtected('Dashboard', dashboardPage.render))
    .register('/habits', guardProtected('Habits', habitsPage.render))
    .register('/calendar', guardProtected('Calendar', calendarPage.render))
    .register('/analytics', guardProtected('Analytics', analyticsPage.render))
    .register('/journal', guardProtected('Journal', journalPage.render))
    .register('/achievements', guardProtected('Achievements', achievementsPage.render))
    .register('/settings', guardProtected('Settings', settingsPage.render))
    .register('/profile', guardProtected('Profile', profilePage.render))
    .setDefault('/dashboard');

  // 5. Synchronize router state with layout UI
  router.onChange(({ path, title }) => {
    appLayout.setPageTitle(title);
    appLayout.setActiveRoute(path);
  });

  // 6. Listen for auth changes to adjust routing or layout immediately
  window.addEventListener('auth:statechange', (e) => {
    const { isAuthenticated } = e.detail;
    const current = router.currentPath;
    const isPublic = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(current);
    
    if (isAuthenticated) {
      // Update avatar immediately after authentication/profile changes.
      syncTopnavAvatar();
      
      if (isPublic) {
        router.navigate('/dashboard');
      }
    } else {
      if (!isPublic) {
        router.navigate('/login');
      }
    }
  });

  window.addEventListener('profile:photochange', syncTopnavAvatar);
  document.getElementById('topnav-avatar')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.navigate('/profile'); }
  });

  // 7. Bind global click delegation for navigation and modal triggers
  document.addEventListener('click', (e) => {
    if (e.target.closest('#topnav-avatar')) {
      router.navigate('/profile');
      return;
    }

    // Global fail-safe delegated handler for Create Habit buttons
    const habitTrigger = e.target.closest('#create-habit-btn, #header-create-habit-btn, #dashboard-create-habit-btn');
    if (habitTrigger) {
      e.preventDefault();
      const defaultDate = new Date().toISOString().split('T')[0];
      
      const modalId = modalManager.open({
        title: 'Create New Habit',
        body: `
          <form id="modal-habit-form" class="d-flex flex-col gap-4">
            <div class="form-group">
              <label class="form-label form-label-required" for="modal-habit-name">Habit Name</label>
              <input type="text" class="form-input" id="modal-habit-name" placeholder="e.g. Morning Meditation, Read 20 mins..." required />
            </div>
            
            <div class="form-group">
              <label class="form-label" for="modal-habit-desc">Description</label>
              <input type="text" class="form-input" id="modal-habit-desc" placeholder="Brief notes or reminders..." />
            </div>

            <div class="row">
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label form-label-required" for="modal-habit-category">Category</label>
                  <select class="form-input" id="modal-habit-category">
                    <option value="productivity">Productivity</option>
                    <option value="health">Health & Fitness</option>
                    <option value="learning">Learning</option>
                    <option value="mindfulness">Mindfulness & Wellness</option>
                  </select>
                </div>
              </div>
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label form-label-required" for="modal-habit-frequency">Frequency</label>
                  <select class="form-input" id="modal-habit-frequency">
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-12">
                <div class="form-group">
                  <label class="form-label form-label-required" for="modal-habit-start">Start Date</label>
                  <input type="date" class="form-input" id="modal-habit-start" value="${defaultDate}" required />
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label" for="modal-habit-icon">Icon</label>
                  <select class="form-input" id="modal-habit-icon">
                    <option value="target">Target</option>
                    <option value="activity">Activity</option>
                    <option value="flame">Flame</option>
                    <option value="book-open">Book</option>
                    <option value="sparkles">Sparkles</option>
                  </select>
                </div>
              </div>
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label" for="modal-habit-color">Color</label>
                  <select class="form-input" id="modal-habit-color">
                    <option value="var(--color-primary)">Blue</option>
                    <option value="var(--color-success)">Green</option>
                    <option value="var(--color-warning)">Orange</option>
                    <option value="var(--color-danger)">Red</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        `,
        footer: `
          <button type="button" class="btn btn--secondary btn--sm" data-modal-close>Cancel</button>
          <button type="button" class="btn btn--primary btn--sm" id="modal-save-habit-btn">Create Habit</button>
        `
      });

      setTimeout(() => {
        const saveBtn = document.getElementById('modal-save-habit-btn');
        if (saveBtn) {
          saveBtn.onclick = async () => {
            const nameInput = document.getElementById('modal-habit-name');
            const descInput = document.getElementById('modal-habit-desc');
            const categorySelect = document.getElementById('modal-habit-category');
            const freqSelect = document.getElementById('modal-habit-frequency');
            const startInput = document.getElementById('modal-habit-start');
            const iconSelect = document.getElementById('modal-habit-icon');
            const colorSelect = document.getElementById('modal-habit-color');

            if (!nameInput || !nameInput.value.trim()) {
              toastManager.error('Please enter a habit name.', 'Validation Error');
              return;
            }
            if (!startInput || !startInput.value) {
              toastManager.error('Please select a start date.', 'Validation Error');
              return;
            }

            const payload = {
              name: nameInput.value.trim(),
              description: descInput ? descInput.value.trim() : null,
              category: categorySelect ? categorySelect.value : 'productivity',
              frequency: freqSelect ? freqSelect.value : 'Daily',
              start_date: startInput.value,
              icon: iconSelect ? iconSelect.value : 'target',
              color: colorSelect ? colorSelect.value : 'var(--color-primary)'
            };

            try {
              saveBtn.disabled = true;
              saveBtn.classList.add('loading');
              
              await api.post('/habits', payload);
              toastManager.success(`"${payload.name}" created successfully!`, 'Habit Created');
              modalManager.close(modalId);
              
              if (router.currentPath === '/habits') {
                habitsPage.render(appLayout.getContentContainer(), false);
              } else {
                router.navigate('/habits');
              }
            } catch (err) {
              toastManager.error(err.message || 'Failed to create habit.', 'Error');
              saveBtn.disabled = false;
              saveBtn.classList.remove('loading');
            }
          };
        }
      }, 50);
      return;
    }

    // Global fail-safe delegated handler for New Journal Entry buttons
    const journalTrigger = e.target.closest('#new-journal-btn, #header-new-journal-btn');
    if (journalTrigger) {
      // If not on the journal page, navigate there — the page will handle the modal.
      if (router.currentPath !== '/journal') {
        router.navigate('/journal');
      }
      // Don't prevent default or open a separate modal — let journal.js handle it.
      return;
    }
  });

  // 8. Start the router
  router.start();

  // 9. Register Service Worker for PWA installation & offline caching
  registerServiceWorker();

  // 10. Setup PWA installability prompt listener
  setupPWAInstallation();

  // 11. Sync locally queued changes as soon as connectivity returns.
  window.addEventListener('online', async () => {
    try {
      const result = await api.syncOfflineChanges();
      if (result.synced) toastManager.success(`${result.synced} offline change${result.synced === 1 ? '' : 's'} synced.`, 'Back Online');
    } catch (error) { toastManager.error(error.message, 'Sync Failed'); }
  });
  window.addEventListener('offline:sync-error', () => toastManager.error('An offline change could not be synced and was skipped.', 'Sync Failed'));
  if (navigator.onLine) api.syncOfflineChanges().catch(() => {});

  // Lock is a lightweight local privacy option and does not alter authentication.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && settingsService.get().lockApp && authService.isAuthenticated) {
      if (!window.confirm('HabitFlow Pro is locked. Continue to unlock?')) document.body.style.visibility = 'hidden';
      else document.body.style.visibility = '';
    }
  });
}

/**
 * Service Worker registration
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((registration) => {
          console.log('[Service Worker] Scope:', registration.scope);
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed:', error);
        });
    });
  }
}

/**
 * Handle custom PWA install prompt hooks
 */
function setupPWAInstallation() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt immediately
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event triggered and captured.');
    
    // Dispatch custom event to notify components that PWA is installable
    window.dispatchEvent(new CustomEvent('pwa:installable', { detail: { prompt: e } }));
    
    // We can also trigger a toast showing that the app can be installed!
    setTimeout(() => {
      toastManager.show({
        title: 'Install App',
        message: 'Install HabitFlow Pro on your device for offline access!',
        variant: 'info',
        duration: 8000,
      });
    }, 3000);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application successfully installed.');
    deferredPrompt = null;
    toastManager.success('HabitFlow Pro installed successfully!');
  });
}

// Boot the application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', init);

// Export installation function for settings or install button triggers
export function promptPWAInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      } else {
        console.log('[PWA] User dismissed install prompt');
      }
      deferredPrompt = null;
    });
  } else {
    toastManager.info('PWA is already installed or not supported on this browser.');
  }
}
