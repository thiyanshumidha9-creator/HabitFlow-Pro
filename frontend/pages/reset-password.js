/* ============================================
   HabitFlow Pro — Reset Password Page (UI Only)
   ============================================ */

import { createAuthLayout, createAuthCard, createPasswordInput, createLoadingButton } from '../components/auth-components.js';
import { validatePassword, validateConfirmPassword } from '../services/validation.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';
import { $, on } from '../utils/dom.js';

/**
 * Render the Reset Password page module.
 * @param {Element} container - Main app content mount container
 */
export function render(container) {
  const formHTML = `
    <form id="reset-form" class="d-flex flex-col gap-4">
      ${createPasswordInput({
        name: 'password',
        label: 'New Password',
        placeholder: 'Min 8 chars, 1 upper, 1 lower, 1 digit',
        required: true
      })}

      ${createPasswordInput({
        name: 'confirm_password',
        label: 'Confirm New Password',
        placeholder: '••••••••',
        required: true
      })}

      <div class="mt-4">
        ${createLoadingButton({
          text: 'Update Password',
          id: 'reset-submit-btn',
          type: 'submit'
        })}
      </div>
    </form>
  `;

  const footerHTML = `
    <div style="font-size: var(--fs-sm); color: var(--text-secondary); text-align: center; width: 100%;">
      Back to <a href="#/login" class="text-link fw-semibold">Sign in</a>
    </div>
  `;

  container.innerHTML = createAuthLayout(
    createAuthCard({
      title: 'Choose New Password',
      subtitle: 'Create a strong, secure password for your account',
      body: formHTML,
      footer: footerHTML
    })
  );

  renderIcons();
  bindEvents(container);
}

/**
 * Event bindings for Reset Password Page
 * @param {Element} container
 */
function bindEvents(container) {
  const form = $('#reset-form', container);
  const passwordInput = $('#input-password', form);
  const confirmInput = $('#input-confirm_password', form);
  const submitBtn = $('#reset-submit-btn', form);

  if (!form) return;

  on(form, 'submit', (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors();

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    // 1. Validate fields
    let isValid = true;

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      showInputError(passwordInput, passwordCheck.message);
      isValid = false;
    }

    const confirmCheck = validateConfirmPassword(password, confirmPassword);
    if (!confirmCheck.isValid) {
      showInputError(confirmInput, confirmCheck.message);
      isValid = false;
    }

    if (!isValid) return;

    // 2. Set loading states
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    passwordInput.disabled = true;
    confirmInput.disabled = true;

    // 3. Mock password reset submission
    setTimeout(() => {
      toastManager.success('Your password has been successfully updated.', 'Password Reset Complete');
      window.location.hash = '#/login';
    }, 1500);
  });

  // Helpers
  function clearErrors() {
    [passwordInput, confirmInput].forEach(input => {
      input.classList.remove('form-input--error');
      const helper = document.getElementById(`${input.id}-helper`);
      if (helper) {
        helper.className = 'form-helper';
        helper.innerHTML = '';
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
