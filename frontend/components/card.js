/* ============================================
   HabitFlow Pro — Card Component
   ============================================ */

/**
 * Create a card element.
 *
 * @param {Object} options
 * @param {string} [options.variant='default'] - 'default'|'elevated'|'outlined'|'flat'|'interactive'
 * @param {string} [options.size=''] - ''|'sm'|'lg'
 * @param {string} [options.title=''] - Card header title
 * @param {string} [options.subtitle=''] - Card header subtitle
 * @param {string} [options.body=''] - Card body HTML content
 * @param {string} [options.footer=''] - Card footer HTML content
 * @param {string} [options.headerActions=''] - HTML for header action buttons
 * @param {string} [options.className=''] - Extra CSS classes
 * @returns {string} HTML string
 */
export function createCard(options = {}) {
  const {
    variant = 'default',
    size = '',
    title = '',
    subtitle = '',
    body = '',
    footer = '',
    headerActions = '',
    className = '',
  } = options;

  const variantClass = variant !== 'default' ? `card--${variant}` : '';
  const sizeClass = size ? `card--${size}` : '';

  const headerHTML = title ? `
    <div class="card-header">
      <div>
        <div class="card-header-title">${title}</div>
        ${subtitle ? `<div class="card-header-subtitle">${subtitle}</div>` : ''}
      </div>
      ${headerActions ? `<div class="card-header-actions">${headerActions}</div>` : ''}
    </div>
  ` : '';

  const bodyHTML = body ? `
    <div class="card-body">${body}</div>
  ` : '';

  const footerHTML = footer ? `
    <div class="card-footer">${footer}</div>
  ` : '';

  return `
    <div class="card ${variantClass} ${sizeClass} ${className}".trim()>
      ${headerHTML}
      ${bodyHTML}
      ${footerHTML}
    </div>
  `;
}
