/* ============================================
   HabitFlow Pro — Input Component
   ============================================ */

/**
 * Create a form input group HTML string.
 *
 * @param {Object} options
 * @param {string} [options.type='text'] - Input type
 * @param {string} [options.name=''] - Input name attribute
 * @param {string} [options.id=''] - Input ID
 * @param {string} [options.label=''] - Label text
 * @param {string} [options.placeholder=''] - Placeholder text
 * @param {string} [options.value=''] - Default value
 * @param {string} [options.helper=''] - Helper text below input
 * @param {string} [options.error=''] - Error message (shows error state)
 * @param {string} [options.success=''] - Success message (shows success state)
 * @param {boolean} [options.required=false] - Required field
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.size=''] - ''|'sm'|'lg'
 * @param {string} [options.icon=''] - Lucide icon name
 * @param {string} [options.className=''] - Extra CSS classes
 * @returns {string} HTML string
 */
export function createInput(options = {}) {
  const {
    type = 'text',
    name = '',
    id = '',
    label = '',
    placeholder = '',
    value = '',
    helper = '',
    error = '',
    success = '',
    required = false,
    disabled = false,
    size = '',
    icon = '',
    className = '',
  } = options;

  const inputId = id || `input-${name}`;
  const stateClass = error ? 'form-input--error' : success ? 'form-input--success' : '';
  const sizeClass = size ? `form-input--${size}` : '';
  const requiredClass = required ? 'form-label-required' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const requiredAttr = required ? 'required' : '';

  const labelHTML = label ? `
    <label class="form-label ${requiredClass}" for="${inputId}">${label}</label>
  ` : '';

  let inputHTML;
  if (icon) {
    inputHTML = `
      <div class="form-input-wrapper">
        <span class="form-input-icon"><i data-lucide="${icon}"></i></span>
        <input type="${type}" class="form-input ${stateClass} ${sizeClass} ${className}"
               id="${inputId}" name="${name}" placeholder="${placeholder}"
               value="${value}" ${disabledAttr} ${requiredAttr}
               aria-describedby="${inputId}-helper" />
      </div>
    `;
  } else {
    inputHTML = `
      <input type="${type}" class="form-input ${stateClass} ${sizeClass} ${className}"
             id="${inputId}" name="${name}" placeholder="${placeholder}"
             value="${value}" ${disabledAttr} ${requiredAttr}
             aria-describedby="${inputId}-helper" />
    `;
  }

  const messageHTML = error
    ? `<span class="form-error" id="${inputId}-helper"><i data-lucide="alert-circle" style="width:14px;height:14px;"></i> ${error}</span>`
    : success
      ? `<span class="form-success" id="${inputId}-helper">${success}</span>`
      : helper
        ? `<span class="form-helper" id="${inputId}-helper">${helper}</span>`
        : '';

  return `
    <div class="form-group">
      ${labelHTML}
      ${inputHTML}
      ${messageHTML}
    </div>
  `;
}
