/* ============================================
   HabitFlow Pro — Settings Page
   ============================================ */

import { createCard } from '../components/card.js';
import { createButton } from '../components/button.js';
import { createInput } from '../components/input.js';
import { createPasswordInput } from '../components/auth-components.js';
import { renderIcons } from '../utils/icons.js';
import { themeManager } from '../utils/theme.js';
import { authService } from '../services/auth-service.js';
import { toastManager } from '../components/toast.js';
import { validateFullName, validatePassword, validateConfirmPassword } from '../services/validation.js';
import { $, on } from '../utils/dom.js';

/**
 * Render the Settings page.
 * @param {Element} container
 */
export function render(container) {
  const currentTheme = themeManager.current;
  const user = authService.currentUser;

  if (!user) {
    container.innerHTML = `
      <div class="page-enter text-center py-12">
        <h2 class="heading-3 mb-2">Not Authenticated</h2>
        <p class="text-body-sm mb-6">Please log in to customize settings.</p>
        <a href="#/login" class="btn btn--primary">Log In</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Customize and manage your HabitFlow Pro workspace</p>
        </div>
      </div>

      <div class="d-flex flex-col gap-6" style="max-width: 640px;">
        <!-- Appearance Card -->
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

        <!-- Account Settings Card -->
        ${createCard({
          title: 'Account Settings',
          subtitle: 'Manage your profile information and account session',
          body: `
            <form id="account-info-form" class="d-flex flex-col gap-4">
              ${createInput({
                type: 'text',
                name: 'full_name',
                label: 'Full Name',
                value: user.full_name,
                required: true,
                icon: 'user'
              })}

              ${createInput({
                type: 'email',
                name: 'email',
                label: 'Email Address',
                value: user.email,
                disabled: true,
                icon: 'mail',
                helper: 'Email address cannot be changed'
              })}

              <div class="d-flex justify-between items-center mt-2">
                ${createButton({
                  text: 'Save Info',
                  variant: 'primary',
                  size: 'sm',
                  type: 'submit',
                  id: 'save-info-btn'
                })}
                ${createButton({
                  text: 'Sign Out',
                  variant: 'danger',
                  size: 'sm',
                  id: 'settings-logout-btn',
                  iconLeft: 'log-out'
                })}
              </div>
            </form>
          `
        })}

        <!-- Change Password Card -->
        ${createCard({
          title: 'Security & Password',
          subtitle: 'Change your account password',
          body: `
            <form id="security-form" class="d-flex flex-col gap-4">
              ${createPasswordInput({
                name: 'current_password',
                label: 'Current Password',
                placeholder: '••••••••',
                required: true
              })}

              ${createPasswordInput({
                name: 'new_password',
                label: 'New Password',
                placeholder: '••••••••',
                required: true
              })}

              ${createPasswordInput({
                name: 'confirm_new_password',
                label: 'Confirm New Password',
                placeholder: '••••••••',
                required: true
              })}

              <div class="mt-2">
                ${createButton({
                  text: 'Update Password',
                  variant: 'secondary',
                  size: 'sm',
                  type: 'submit',
                  id: 'save-security-btn'
                })}
              </div>
            </form>
          `
        })}

        <!-- Data & Privacy Card -->
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
  bindEvents(container);
}

/**
 * Event bindings for Settings Page
 * @param {Element} container
 */
function bindEvents(container) {
  // Theme toggle button
  const themeBtn = $('#settings-theme-btn', container);
  if (themeBtn) {
    on(themeBtn, 'click', () => {
      themeManager.toggle();
      render(container);
    });
  }

  // Logout button
  const logoutBtn = $('#settings-logout-btn', container);
  if (logoutBtn) {
    on(logoutBtn, 'click', async () => {
      try {
        logoutBtn.classList.add('loading');
        logoutBtn.disabled = true;
        await authService.logout();
        toastManager.success('You have been logged out successfully.', 'Session Terminated');
        window.location.hash = '#/login';
      } catch (err) {
        logoutBtn.classList.remove('loading');
        logoutBtn.disabled = false;
        toastManager.error('Logout request failed. Please try again.', 'Error');
      }
    });
  }

  // Account Info Form Submit (Mock save)
  const infoForm = $('#account-info-form', container);
  const nameInput = $('#input-full_name', infoForm);
  const saveInfoBtn = $('#save-info-btn', infoForm);
  if (infoForm) {
    on(infoForm, 'submit', (e) => {
      e.preventDefault();
      
      const newName = nameInput.value;
      const check = validateFullName(newName);

      if (!check.isValid) {
        nameInput.classList.add('form-input--error');
        const helper = document.getElementById(`${nameInput.id}-helper`);
        if (helper) {
          helper.className = 'form-error';
          helper.innerHTML = `<i data-lucide="alert-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>${check.message}`;
          renderIcons();
        }
        return;
      }

      // Clear errors
      nameInput.classList.remove('form-input--error');
      
      saveInfoBtn.classList.add('loading');
      saveInfoBtn.disabled = true;

      // Mock delay
      setTimeout(() => {
        saveInfoBtn.classList.remove('loading');
        saveInfoBtn.disabled = false;
        
        // Update user display name in mock memory
        if (authService.currentUser) {
          authService.currentUser.full_name = newName;
          
          // Re-render UI to update top nav, user menu etc.
          const avatar = document.getElementById('topnav-avatar');
          if (avatar) avatar.textContent = newName.charAt(0).toUpperCase();
        }
        
        toastManager.success('Account information updated successfully.', 'Information Saved');
      }, 1000);
    });
  }

  // Security Form Submit (Mock update)
  const securityForm = $('#security-form', container);
  const currentPass = $('#input-current_password', securityForm);
  const newPass = $('#input-new_password', securityForm);
  const confirmNewPass = $('#input-confirm_new_password', securityForm);
  const saveSecurityBtn = $('#save-security-btn', securityForm);

  if (securityForm) {
    on(securityForm, 'submit', (e) => {
      e.preventDefault();

      // Clear errors
      [currentPass, newPass, confirmNewPass].forEach(input => {
        input.classList.remove('form-input--error');
        const helper = document.getElementById(`${input.id}-helper`);
        if (helper) {
          helper.className = 'form-helper';
          helper.innerHTML = '';
        }
      });

      let isValid = true;

      // Validate new password
      const newCheck = validatePassword(newPass.value);
      if (!newCheck.isValid) {
        showInputError(newPass, newCheck.message);
        isValid = false;
      }

      // Validate confirm
      const confirmCheck = validateConfirmPassword(newPass.value, confirmNewPass.value);
      if (!confirmCheck.isValid) {
        showInputError(confirmNewPass, confirmCheck.message);
        isValid = false;
      }

      if (!isValid) return;

      saveSecurityBtn.classList.add('loading');
      saveSecurityBtn.disabled = true;

      // Mock update
      setTimeout(() => {
        saveSecurityBtn.classList.remove('loading');
        saveSecurityBtn.disabled = false;
        currentPass.value = '';
        newPass.value = '';
        confirmNewPass.value = '';
        toastManager.success('Your security password has been changed.', 'Password Updated');
      }, 1200);
    });
  }

  function showInputError(input, msg) {
    input.classList.add('form-input--error');
    const helper = document.getElementById(`${input.id}-helper`);
    if (helper) {
      helper.className = 'form-error';
      helper.innerHTML = `<i data-lucide="alert-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>${msg}`;
      renderIcons();
    }
  }
}
