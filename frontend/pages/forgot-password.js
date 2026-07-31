/* ============================================
   HabitFlow Pro — Forgot Password Page (UI Only)
   ============================================ */

import { createAuthLayout, createAuthCard, createLoadingButton } from '../components/auth-components.js';
import { createInput } from '../components/input.js';
import { validateEmail } from '../services/validation.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';
import { $, on } from '../utils/dom.js';

/**
 * Render the Forgot Password page module.
 * @param {Element} container - Main app content mount container
 */
export function render(container) {
  const formHTML = `
    <div id="forgot-flow-container">
      <form id="forgot-form" class="d-flex flex-col gap-4">
        ${createInput({
          type: 'email',
          name: 'email',
          label: 'Email Address',
          placeholder: 'name@example.com',
          required: true,
          icon: 'mail',
          helper: 'Enter your email address and we\'ll send you a link to reset your password.'
        })}

        <div class="mt-4">
          ${createLoadingButton({
            text: 'Send Reset Link',
            id: 'forgot-submit-btn',
            type: 'submit'
          })}
        </div>
      </form>
    </div>
  `;

  const footerHTML = `
    <div style="font-size: var(--fs-sm); color: var(--text-secondary); text-align: center; width: 100%;">
      Back to <a href="#/login" class="text-link fw-semibold">Sign in</a>
    </div>
  `;

  container.innerHTML = createAuthLayout(
    createAuthCard({
      title: 'Reset Password',
      subtitle: 'Recover your account access credentials',
      body: formHTML,
      footer: footerHTML
    })
  );

  renderIcons();
  bindEvents(container);
}

/**
 * Event bindings for Forgot Password Page
 * @param {Element} container
 */
function bindEvents(container) {
  const form = $('#forgot-form', container);
  const emailInput = $('#input-email', form);
  const submitBtn = $('#forgot-submit-btn', form);
  const flowContainer = $('#forgot-flow-container', container);

  if (!form) return;

  on(form, 'submit', (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    // 1. Validate email
    const check = validateEmail(email);
    if (!check.isValid) {
      emailInput.classList.add('form-input--error');
      const helper = document.getElementById(`${emailInput.id}-helper`);
      if (helper) {
        helper.className = 'form-error';
        helper.innerHTML = `<i data-lucide="alert-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>${check.message}`;
        renderIcons();
      }
      return;
    }

    // Clear errors
    emailInput.classList.remove('form-input--error');

    // 2. Mock submission
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    emailInput.disabled = true;

    setTimeout(() => {
      // Show success state UI
      toastManager.success('Password reset email sent successfully!', 'Email Sent');
      
      flowContainer.innerHTML = `
        <div class="animate-scale-in text-center py-4">
          <div style="width: 56px; height: 56px; border-radius: var(--radius-full); background: var(--color-success-light); display: flex; align-items: center; justify-content: center; color: var(--color-success); margin: 0 auto 16px;">
            <i data-lucide="mail-check" style="width: 28px; height: 28px;"></i>
          </div>
          <h3 class="heading-4 mb-2" style="font-weight: var(--fw-semibold);">Check your inbox</h3>
          <p class="text-body-sm mb-6" style="line-height: var(--lh-relaxed);">
            We have sent a secure password reset link to <strong class="text-primary">${email}</strong>. 
            The link will expire in 60 minutes.
          </p>
          <button type="button" id="forgot-resend-btn" class="btn btn--outline btn--sm mx-auto">
            Resend Email
          </button>
        </div>
      `;
      
      renderIcons();

      const resendBtn = $('#forgot-resend-btn', flowContainer);
      if (resendBtn) {
        on(resendBtn, 'click', () => {
          toastManager.info('Reset email resent successfully.');
        });
      }
    }, 1500);
  });
}
