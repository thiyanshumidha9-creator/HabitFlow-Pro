/* ============================================
   HabitFlow Pro — Signup Page
   ============================================ */

import { createAuthLayout, createAuthCard, createPasswordInput, createLoadingButton } from '../components/auth-components.js';
import { createInput } from '../components/input.js';
import { validateEmail, validateFullName, validatePassword, validateConfirmPassword } from '../services/validation.js';
import { authService } from '../services/auth-service.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';
import { $, on } from '../utils/dom.js';

/**
 * Render the Signup page module.
 * @param {Element} container - Main app content mount container
 */
export function render(container) {
  const formHTML = `
    <form id="signup-form" class="d-flex flex-col gap-4">
      <div id="signup-error-container" class="d-none"></div>

      ${createInput({
        type: 'text',
        name: 'full_name',
        label: 'Full Name',
        placeholder: 'John Doe',
        required: true,
        icon: 'user'
      })}

      ${createInput({
        type: 'email',
        name: 'email',
        label: 'Email Address',
        placeholder: 'name@example.com',
        required: true,
        icon: 'mail'
      })}

      ${createPasswordInput({
        name: 'password',
        label: 'Password',
        placeholder: 'Min 8 chars, 1 upper, 1 lower, 1 digit',
        required: true
      })}

      ${createPasswordInput({
        name: 'confirm_password',
        label: 'Confirm Password',
        placeholder: '••••••••',
        required: true
      })}

      <div class="mt-4">
        ${createLoadingButton({
          text: 'Create Account',
          id: 'signup-submit-btn'
        })}
      </div>
    </form>
  `;

  const footerHTML = `
    <div style="font-size: var(--fs-sm); color: var(--text-secondary); text-align: center; width: 100%;">
      Already have an account? <a href="#/login" class="text-link fw-semibold">Sign in</a>
    </div>
  `;

  container.innerHTML = createAuthLayout(
    createAuthCard({
      title: 'Get Started',
      subtitle: 'Create a free account and start tracking your habits',
      body: formHTML,
      footer: footerHTML
    })
  );

  renderIcons();
  bindEvents(container);
}

/**
 * Event bindings for Signup Page
 * @param {Element} container
 */
function bindEvents(container) {
  const form = $('#signup-form', container);
  const nameInput = $('#input-full_name', form);
  const emailInput = $('#input-email', form);
  const passwordInput = $('#input-password', form);
  const confirmInput = $('#input-confirm_password', form);
  const submitBtn = $('#signup-submit-btn', form);
  const errorAlert = $('#signup-error-container', form);

  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();

    const fullName = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    // 1. Perform form validations
    let isValid = true;

    const nameCheck = validateFullName(fullName);
    if (!nameCheck.isValid) {
      showInputError(nameInput, nameCheck.message);
      isValid = false;
    }
    
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      showInputError(emailInput, emailCheck.message);
      isValid = false;
    }

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
    nameInput.disabled = true;
    emailInput.disabled = true;
    passwordInput.disabled = true;
    confirmInput.disabled = true;

    try {
      // 3. Request registration
      await authService.signup(email, fullName, password);
      
      // Success toast and redirection
      toastManager.success('Account created successfully!', 'Welcome to HabitFlow Pro');
      window.location.hash = '#/dashboard';
    } catch (err) {
      // Restore states
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      nameInput.disabled = false;
      emailInput.disabled = false;
      passwordInput.disabled = false;
      confirmInput.disabled = false;
      
      passwordInput.value = '';
      confirmInput.value = '';
      passwordInput.focus();

      // Show alert details
      let alertMsg = err.message || 'An unexpected error occurred. Please try again.';
      
      if (err.status === 409) {
        alertMsg = 'This email address is already registered. Please sign in or use another email.';
        showInputError(emailInput, 'Email is already taken.');
      }
      
      showGlobalError(alertMsg);
      toastManager.error(alertMsg, 'Registration Failed');
    }
  });

  // Helpers
  function clearErrors() {
    errorAlert.className = 'd-none';
    errorAlert.innerHTML = '';
    
    // Clear field-level indicators
    [nameInput, emailInput, passwordInput, confirmInput].forEach(input => {
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

  function showGlobalError(msg) {
    errorAlert.className = 'error-inline mb-4 animate-scale-in';
    errorAlert.innerHTML = `
      <span class="error-inline-icon"><i data-lucide="alert-octagon"></i></span>
      <span class="error-inline-message">${msg}</span>
    `;
    renderIcons();
  }
}
