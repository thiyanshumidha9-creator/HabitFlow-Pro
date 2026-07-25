/* ============================================
   HabitFlow Pro — Application Bootstrapper
   ============================================ */

import { router } from './utils/router.js';
import { themeManager } from './utils/theme.js';
import { modalManager } from './components/modal.js';
import { toastManager } from './components/toast.js';
import { appLayout } from './layouts/app-layout.js';

// Import pages
import * as dashboardPage from './pages/dashboard.js';
import * as habitsPage from './pages/habits.js';
import * as calendarPage from './pages/calendar.js';
import * as analyticsPage from './pages/analytics.js';
import * as journalPage from './pages/journal.js';
import * as achievementsPage from './pages/achievements.js';
import * as settingsPage from './pages/settings.js';

// PWA installation helper
let deferredPrompt = null;

// Initialize app
function init() {
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

  // 3. Register pages with SPA router
  const contentContainer = appLayout.getContentContainer();

  router
    .register('/dashboard', {
      title: 'Dashboard',
      load: () => dashboardPage.render(contentContainer),
    })
    .register('/habits', {
      title: 'Habits',
      load: () => habitsPage.render(contentContainer),
    })
    .register('/calendar', {
      title: 'Calendar',
      load: () => calendarPage.render(contentContainer),
    })
    .register('/analytics', {
      title: 'Analytics',
      load: () => analyticsPage.render(contentContainer),
    })
    .register('/journal', {
      title: 'Journal',
      load: () => journalPage.render(contentContainer),
    })
    .register('/achievements', {
      title: 'Achievements',
      load: () => achievementsPage.render(contentContainer),
    })
    .register('/settings', {
      title: 'Settings',
      load: () => settingsPage.render(contentContainer),
    })
    .setDefault('/dashboard');

  // 4. Synchronize router state with layout UI
  router.onChange(({ path, title }) => {
    appLayout.setPageTitle(title);
    appLayout.setActiveRoute(path);
  });

  // 5. Start the router
  router.start();

  // 6. Register Service Worker for PWA installation & offline caching
  registerServiceWorker();

  // 7. Setup PWA installability prompt listener
  setupPWAInstallation();
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
