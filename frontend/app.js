/* ============================================
   HabitFlow Pro — Application Bootstrapper
   ============================================ */

import { router } from './utils/router.js';
import { themeManager } from './utils/theme.js';
import { modalManager } from './components/modal.js';
import { toastManager } from './components/toast.js';
import { appLayout } from './layouts/app-layout.js';
import { authService } from './services/auth-service.js';

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
  const guardProtected = (title, renderFn) => ({
    title,
    load: () => {
      if (!authService.isAuthenticated) {
        router.navigate('/login');
      } else {
        appLayout.setAuthMode(false);
        renderFn(contentContainer);
        // Sync topnav avatar letter
        const avatar = document.getElementById('topnav-avatar');
        if (avatar && authService.currentUser) {
          avatar.textContent = (authService.currentUser.full_name || 'U').charAt(0).toUpperCase();
        }
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
      // Update avatar letter immediately
      const avatar = document.getElementById('topnav-avatar');
      if (avatar && authService.currentUser) {
        avatar.textContent = (authService.currentUser.full_name || 'U').charAt(0).toUpperCase();
      }
      
      if (isPublic) {
        router.navigate('/dashboard');
      }
    } else {
      if (!isPublic) {
        router.navigate('/login');
      }
    }
  });

  // 7. Bind global click delegation for navigation triggers
  document.addEventListener('click', (e) => {
    if (e.target.closest('#topnav-avatar')) {
      router.navigate('/profile');
    }
  });

  // 8. Start the router
  router.start();

  // 9. Register Service Worker for PWA installation & offline caching
  registerServiceWorker();

  // 10. Setup PWA installability prompt listener
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
