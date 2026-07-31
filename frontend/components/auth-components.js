/* ============================================
   HabitFlow Pro — Reusable Authentication Components
   ============================================
   Provides Password Inputs, Remember Checkboxes,
   and Layout structures for the Auth module.
   ============================================ */

import { createButton } from './button.js';
import { createCard } from './card.js';

/**
 * Creates a Password input with show/hide password toggle.
 *
 * @param {Object} options
 * @param {string} [options.name='password'] - Field name
 * @param {string} [options.id=''] - Field ID
 * @param {string} [options.label='Password'] - Label
 * @param {string} [options.placeholder='••••••••'] - Placeholder
 * @param {string} [options.error=''] - Active validation error
 * @param {boolean} [options.required=true] - Required state
 * @returns {string} HTML string
 */
export function createPasswordInput(options = {}) {
  const {
    name = 'password',
    id = '',
    label = 'Password',
    placeholder = '••••••••',
    error = '',
    required = true,
  } = options;

  const inputId = id || `input-${name}`;
  const stateClass = error ? 'form-input--error' : '';
  const requiredClass = required ? 'form-label-required' : '';
  const requiredAttr = required ? 'required' : '';

  const messageHTML = error
    ? `<span class="form-error" id="${inputId}-helper"><i data-lucide="alert-circle" style="width:14px;height:14px;"></i> ${error}</span>`
    : '';

  return `
    <div class="form-group">
      <label class="form-label ${requiredClass}" for="${inputId}">${label}</label>
      <div class="form-input-wrapper" style="position: relative;">
        <span class="form-input-icon"><i data-lucide="lock"></i></span>
        <input type="password" 
               class="form-input ${stateClass}" 
               id="${inputId}" 
               name="${name}" 
               placeholder="${placeholder}" 
               style="padding-right: 44px;"
               ${requiredAttr} 
               aria-describedby="${inputId}-helper" />
        <button type="button" 
                class="password-toggle-btn"
                data-password-toggle 
                aria-label="Toggle password visibility"
                style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); cursor: pointer; border: none; background: none; border-radius: var(--radius-sm);">
          <i data-lucide="eye" style="width:18px;height:18px;"></i>
        </button>
      </div>
      ${messageHTML}
    </div>
  `;
}

/**
 * Creates a Remember Me Checkbox.
 *
 * @param {Object} options
 * @param {boolean} [options.checked=false] - Initial state
 * @param {string} [options.id='remember-me'] - ID
 * @returns {string} HTML string
 */
export function createRememberCheckbox(options = {}) {
  const { checked = false, id = 'remember-me' } = options;
  const checkedAttr = checked ? 'checked' : '';

  return `
    <label class="form-check" for="${id}">
      <input type="checkbox" class="form-check-input" id="${id}" name="remember_me" ${checkedAttr} />
      <span class="form-check-label" style="font-size: var(--fs-sm); color: var(--text-secondary);">Remember me</span>
    </label>
  `;
}

/**
 * Creates a Loading Button (wrapper around design system button).
 *
 * @param {Object} options
 * @param {string} options.text - Label
 * @param {boolean} [options.loading=false] - Loading state
 * @param {string} [options.id='']
 * @returns {string} HTML string
 */
export function createLoadingButton(options = {}) {
  return createButton({
    type: 'submit',
    ...options,
    variant: 'primary',
    size: 'lg',
    fullWidth: true,
  });
}

/**
 * Renders the wrapper container for authentication screens.
 *
 * @param {string} contentHTML - The interior Card HTML
 * @returns {string} HTML string
 */
export function createAuthLayout(contentHTML) {
  return `
    <div class="auth-wrapper animate-fade-in" style="width: 100%; max-width: 440px; padding: var(--space-4); margin: auto;">
      <div class="auth-brand" style="display: flex; flex-direction: column; align-items: center; gap: var(--space-2); margin-bottom: var(--space-8); text-align: center;">
        <div class="auth-logo" style="width: 48px; height: 48px; border-radius: var(--radius-xl); background: linear-gradient(135deg, var(--color-primary), hsl(var(--brand-hue), 80%, 62%)); display: flex; align-items: center; justify-content: center; color: var(--color-white); box-shadow: var(--shadow-md);">
          <i data-lucide="zap" style="width: 24px; height: 24px;"></i>
        </div>
        <h2 style="font-size: var(--fs-2xl); font-weight: var(--fw-bold); color: var(--text-primary); letter-spacing: var(--ls-tight);">HabitFlow Pro</h2>
        <p style="font-size: var(--fs-sm); color: var(--text-tertiary);">Build routines. Track streaks. Stay accountable.</p>
      </div>
      ${contentHTML}
    </div>
  `;
}

/**
 * Creates an Authentication Card.
 *
 * @param {Object} options
 * @param {string} options.title - Header title
 * @param {string} options.subtitle - Header subtitle
 * @param {string} options.body - Form fields
 * @param {string} [options.footer=''] - Card footer / link triggers
 * @returns {string} HTML string
 */
export function createAuthCard(options = {}) {
  const { title, subtitle, body, footer = '' } = options;
  return createCard({
    variant: 'elevated',
    title,
    subtitle,
    body,
    footer,
    className: 'auth-card animate-slide-up',
  });
}

// Global click delegation for password toggles
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-password-toggle]');
    if (!toggle) return;
    
    // Stop form triggers
    e.preventDefault();
    e.stopPropagation();

    const input = toggle.parentElement.querySelector('input');
    if (input) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      
      const icon = toggle.querySelector('[data-lucide]');
      if (icon && typeof lucide !== 'undefined') {
        icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (lucide.createIcons) lucide.createIcons();
      }
    }
  });
}
