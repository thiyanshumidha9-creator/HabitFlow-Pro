/* ============================================
   HabitFlow Pro — Login Page
   ============================================ */

import { createAuthLayout, createAuthCard, createPasswordInput, createRememberCheckbox, createLoadingButton } from '../components/auth-components.js';
import { createInput } from '../components/input.js';
import { validateEmail, validatePassword } from '../services/validation.js';
import { authService } from '../services/auth-service.js';
import { tokenService } from '../services/token-service.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';
import { $, on } from '../utils/dom.js';

/**
 * Render the Login page module.
 * @param {Element} container - Main app content mount container
 */
export function render(container) {
  const rememberMe = authService.currentUser ? false : tokenService?.getRememberMe?.() || false;

  const formHTML = `
    <form id="login-form" class="d-flex flex-col gap-4">
      <div id="login-error-container" class="d-none"></div>

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
        placeholder: '••••••••',
        required: true
      })}

      <div class="d-flex items-center justify-between mt-2">
        ${createRememberCheckbox({ checked: rememberMe, id: 'remember-me' })}
        <a href="#/forgot-password" class="text-link" style="font-size: var(--fs-sm);">Forgot password?</a>
      </div>

      <div class="mt-4">
        ${createLoadingButton({
          text: 'Sign In',
          id: 'login-submit-btn'
        })}
      </div>
    </form>
  `;

  const footerHTML = `
    <div style="font-size: var(--fs-sm); color: var(--text-secondary); text-align: center; width: 100%;">
      Don't have an account? <a href="#/signup" class="text-link fw-semibold">Create account</a>
    </div>
  `;

  container.innerHTML = createAuthLayout(
    createAuthCard({
      title: 'Welcome Back',
      subtitle: 'Sign in to access your dashboard and habit streaks',
      body: formHTML,
      footer: footerHTML
    })
  );

  renderIcons();
  bindEvents(container);
}

/**
 * Event bindings for Login Page
 * @param {Element} container
 */
function bindEvents(container) {
  const form = $('#login-form', container);
  const emailInput = $('#input-email', form);
  const passwordInput = $('#input-password', form);
  const rememberCheckbox = $('#remember-me', form);
  const submitBtn = $('#login-submit-btn', form);
  const errorAlert = $('#login-error-container', form);

  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();

    const email = emailInput.value;
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox.checked;

    // 1. Perform form validations
    let isValid = true;
    
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

    if (!isValid) return;

    // 2. Set loading states
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    emailInput.disabled = true;
    passwordInput.disabled = true;
    rememberCheckbox.disabled = true;

    try {
      // 3. Request authentication
      await authService.login(email, password, rememberMe);
      
      // Success toast and redirection
      toastManager.success('Welcome back to HabitFlow Pro!', 'Login Successful');
      window.location.hash = '#/dashboard';
    } catch (err) {
      // Restore states
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      emailInput.disabled = false;
      passwordInput.disabled = false;
      rememberCheckbox.disabled = false;
      passwordInput.value = ''; // Clear password field on error
      
      // Focus password on fail
      passwordInput.focus();

      // Show alert details
      const alertMsg = err.status === 401 
        ? 'Invalid email or password. Please verify your credentials and try again.'
        : err.message || 'An unexpected connection error occurred. Please try again.';
      
      showGlobalError(alertMsg);
      toastManager.error(alertMsg, 'Authentication Failed');
    }
  });

  // Helpers
  function clearErrors() {
    errorAlert.className = 'd-none';
    errorAlert.innerHTML = '';
    
    // Clear field-level indicators
    [emailInput, passwordInput].forEach(input => {
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
