/* ============================================
   HabitFlow Pro — Profile Page
   ============================================ */

import { authService } from '../services/auth-service.js';
import { createCard } from '../components/card.js';
import { createInput } from '../components/input.js';
import { createButton } from '../components/button.js';
import { renderIcons } from '../utils/icons.js';
import { toastManager } from '../components/toast.js';
import { validateFullName, validatePhone } from '../services/validation.js';
import { $, on } from '../utils/dom.js';

let isEditing = false;
let isSubmitting = false;

/**
 * Render the Profile page.
 * @param {Element} container - Main content container
 */
export function render(container) {
  const user = authService.currentUser;

  if (!user) {
    container.innerHTML = `
      <div class="page-enter text-center py-12">
        <h2 class="heading-3 mb-2">Not Authenticated</h2>
        <p class="text-body-sm mb-6">Please log in to view your profile details.</p>
        <a href="#/login" class="btn btn--primary">Log In</a>
      </div>
    `;
    return;
  }

  // Format date strings
  const createdDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })
    : 'Unknown';

  const lastLogin = user.last_login_at
    ? new Date(user.last_login_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

  // Read-only view vs Edit-mode view
  const profileBodyHTML = isEditing
    ? `
      <form id="profile-edit-form" class="d-flex flex-col gap-4">
        ${createInput({
          type: 'text',
          name: 'full_name',
          id: 'profile-full-name',
          label: 'Full Name',
          value: user.full_name,
          required: true,
          icon: 'user'
        })}

        ${createInput({
          type: 'tel',
          name: 'phone',
          id: 'profile-phone',
          label: 'Phone Number (Optional)',
          value: user.phone || '',
          placeholder: '+1234567890',
          icon: 'phone'
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

        <div class="d-flex gap-3 mt-2">
          ${createButton({
            text: 'Save Changes',
            variant: 'primary',
            size: 'sm',
            type: 'submit',
            id: 'profile-save-btn'
          })}
          ${createButton({
            text: 'Cancel',
            variant: 'secondary',
            size: 'sm',
            id: 'profile-cancel-btn'
          })}
        </div>
      </form>
    `
    : `
      <div class="d-flex flex-col gap-6">
        <!-- Avatar block -->
        <div class="d-flex items-center gap-4">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--color-primary), hsl(var(--brand-hue), 80%, 62%)); display: flex; align-items: center; justify-content: center; color: var(--color-white); font-size: var(--fs-2xl); font-weight: var(--fw-semibold); user-select: none;">
            ${(user.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 class="heading-4" style="margin: 0;">${user.full_name || 'User'}</h3>
            <span class="text-caption text-accent" style="font-size: var(--fs-xs); font-weight: var(--fw-semibold);">${user.role?.toUpperCase() || 'USER'}</span>
          </div>
        </div>

        <hr class="m-0" />

        <!-- Details block -->
        <div class="d-flex flex-col gap-4">
          <div class="d-flex justify-between items-center">
            <span class="text-body-sm fw-medium">Email Address</span>
            <span class="text-body fw-semibold text-right text-truncate" style="max-width: 220px;" title="${user.email}">${user.email}</span>
          </div>
          <div class="d-flex justify-between items-center">
            <span class="text-body-sm fw-medium">Phone Number</span>
            <span class="text-body fw-semibold text-right">${user.phone || 'Not provided'}</span>
          </div>
          <div class="d-flex justify-between items-center">
            <span class="text-body-sm fw-medium">Member Since</span>
            <span class="text-body fw-semibold text-right">${createdDate}</span>
          </div>
          <div class="d-flex justify-between items-center">
            <span class="text-body-sm fw-medium">Last Login</span>
            <span class="text-body fw-semibold text-right" style="font-size: var(--fs-sm);">${lastLogin}</span>
          </div>
          <div class="d-flex justify-between items-center">
            <span class="text-body-sm fw-medium">Account Status</span>
            <span class="d-inline-flex items-center gap-1" style="font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: ${user.is_active ? 'var(--color-success)' : 'var(--color-danger)'}">
              <span style="width: 8px; height: 8px; border-radius: var(--radius-full); background: currentColor;"></span>
              ${user.is_active ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>

        <div class="d-flex gap-3">
          ${createButton({
            text: 'Edit Profile',
            variant: 'secondary',
            size: 'sm',
            id: 'profile-edit-btn',
            iconLeft: 'user-cog'
          })}
        </div>
      </div>
    `;

  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Profile</h1>
          <p class="page-subtitle">Your personal account dashboard and credentials</p>
        </div>
      </div>

      <div class="row">
        <!-- Main profile details card -->
        <div class="col-12 md:col-6 lg:col-5">
          ${createCard({
            title: 'Account Information',
            subtitle: 'Verified credentials and membership',
            body: profileBodyHTML
          })}
        </div>

        <!-- Right helper/status cards -->
        <div class="col-12 md:col-6 lg:col-7">
          <div class="d-flex flex-col gap-6">
            ${createCard({
              title: 'Security Settings',
              subtitle: 'Update credentials and enable security measures',
              body: `
                <div class="d-flex flex-col gap-4">
                  <p class="text-body-sm" style="line-height: var(--lh-relaxed);">
                    We recommend changing your password regularly and using complex combinations to protect your logs and progress records.
                  </p>
                  <div class="d-flex gap-3">
                    <a href="#/settings" class="btn btn--secondary btn--sm">Manage Settings</a>
                  </div>
                </div>
              `
            })}

            ${createCard({
              title: 'System Preferences',
              subtitle: 'System version and workspace config',
              body: `
                <div class="d-flex flex-col gap-2">
                  <div class="d-flex justify-between items-center py-1">
                    <span class="text-body-sm">Client App Version</span>
                    <span class="text-code">v1.0.0</span>
                  </div>
                  <div class="d-flex justify-between items-center py-1">
                    <span class="text-body-sm">Server Version</span>
                    <span class="text-code">FastAPI 0.115+</span>
                  </div>
                  <div class="d-flex justify-between items-center py-1">
                    <span class="text-body-sm">Offline Capability</span>
                    <span class="d-inline-flex items-center gap-1 text-success" style="font-weight: var(--fw-semibold);">
                      <i data-lucide="check-circle-2" style="width: 16px; height: 16px;"></i> Ready
                    </span>
                  </div>
                </div>
              `
            })}
          </div>
        </div>
      </div>
    </div>
  `;

  renderIcons();
  bindEvents(container);
}

/**
 * Event bindings for Profile Page
 * @param {Element} container
 */
function bindEvents(container) {
  // Edit Profile toggle button
  const editBtn = $('#profile-edit-btn', container);
  if (editBtn) {
    on(editBtn, 'click', () => {
      isEditing = true;
      render(container);
    });
  }

  // Cancel edit button
  const cancelBtn = $('#profile-cancel-btn', container);
  if (cancelBtn) {
    on(cancelBtn, 'click', (e) => {
      e.preventDefault();
      isEditing = false;
      render(container);
    });
  }

  // Submit edit form
  const form = $('#profile-edit-form', container);
  if (form) {
    const nameInput = $('#profile-full-name', form);
    const phoneInput = $('#profile-phone', form);
    const saveBtn = $('#profile-save-btn', form);

    on(form, 'submit', async (e) => {
      e.preventDefault();

      if (isSubmitting) return;

      const newName = nameInput.value.trim();
      const newPhone = phoneInput.value.trim();

      // Clear previous error messages
      [nameInput, phoneInput].forEach(input => {
        input.classList.remove('form-input--error');
        const helper = document.getElementById(`${input.id}-helper`);
        if (helper) {
          helper.className = 'form-helper';
          helper.innerHTML = '';
        }
      });

      // 1. Validate fields
      let isValid = true;

      const nameCheck = validateFullName(newName);
      if (!nameCheck.isValid) {
        showInputError(nameInput, nameCheck.message);
        isValid = false;
      }

      const phoneCheck = validatePhone(newPhone);
      if (!phoneCheck.isValid) {
        showInputError(phoneInput, phoneCheck.message);
        isValid = false;
      }

      if (!isValid) return;

      // 2. Set submitting state to block duplicates and show loader
      isSubmitting = true;
      saveBtn.classList.add('loading');
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      nameInput.disabled = true;
      phoneInput.disabled = true;

      try {
        // Mock profile save API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update active user memory state
        if (authService.currentUser) {
          authService.currentUser.full_name = newName;
          authService.currentUser.phone = newPhone;
          
          // Sync header avatar initials
          const avatar = document.getElementById('topnav-avatar');
          if (avatar) avatar.textContent = newName.charAt(0).toUpperCase();
        }

        toastManager.success('Profile changes saved successfully.', 'Profile Updated');
        isEditing = false;
      } catch (err) {
        toastManager.error(err.message || 'An error occurred while saving profile changes.', 'Update Failed');
      } finally {
        isSubmitting = false;
        render(container);
      }
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
