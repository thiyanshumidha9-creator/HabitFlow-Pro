/* ============================================
   HabitFlow Pro — Button Component
   ============================================ */

/**
 * Create a button HTML string.
 *
 * @param {Object} options
 * @param {string} [options.text=''] - Button label
 * @param {string} [options.variant='primary'] - 'primary'|'secondary'|'ghost'|'danger'|'outline'
 * @param {string} [options.size='md'] - 'sm'|'md'|'lg'
 * @param {string} [options.iconLeft=''] - Lucide icon name for left side
 * @param {string} [options.iconRight=''] - Lucide icon name for right side
 * @param {boolean} [options.loading=false] - Show loading spinner
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {boolean} [options.fullWidth=false] - Full width button
 * @param {boolean} [options.iconOnly=false] - Icon-only button
 * @param {string} [options.id=''] - Element ID
 * @param {string} [options.type='button'] - Button type attribute
 * @param {string} [options.className=''] - Extra CSS classes
 * @param {string} [options.ariaLabel=''] - Accessibility label
 * @returns {string} HTML string
 */
export function createButton(options = {}) {
  const {
    text = '',
    variant = 'primary',
    size = 'md',
    iconLeft = '',
    iconRight = '',
    loading = false,
    disabled = false,
    fullWidth = false,
    iconOnly = false,
    id = '',
    type = 'button',
    className = '',
    ariaLabel = '',
  } = options;

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    iconOnly ? 'btn--icon' : '',
    loading ? 'loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const idAttr = id ? `id="${id}"` : '';
  const disabledAttr = disabled || loading ? 'disabled' : '';
  const ariaAttr = ariaLabel ? `aria-label="${ariaLabel}"` : '';

  const leftIcon = iconLeft ? `<i data-lucide="${iconLeft}" class="btn-icon"></i>` : '';
  const rightIcon = iconRight ? `<i data-lucide="${iconRight}" class="btn-icon"></i>` : '';

  return `
    <button class="${classes}" type="${type}" ${idAttr} ${disabledAttr} ${ariaAttr}>
      ${leftIcon}
      ${iconOnly ? '' : `<span>${text}</span>`}
      ${rightIcon}
    </button>
  `.trim();
}
