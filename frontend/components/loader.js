/* ============================================
   HabitFlow Pro — Loader Component
   ============================================ */

/**
 * Create a spinner HTML string.
 * @param {string} [size=''] - ''|'sm'|'lg'|'xl'
 * @returns {string}
 */
export function createSpinner(size = '') {
  const sizeClass = size ? `spinner--${size}` : '';
  return `<div class="spinner ${sizeClass}" role="status" aria-label="Loading"><span class="sr-only">Loading…</span></div>`;
}

/**
 * Create a page loader (centered spinner + optional text).
 * @param {string} [text='Loading…']
 * @returns {string}
 */
export function createPageLoader(text = 'Loading…') {
  return `
    <div class="page-loader">
      <div class="spinner spinner--lg"></div>
      <span class="page-loader-text">${text}</span>
    </div>
  `;
}

/**
 * Create skeleton placeholder lines.
 * @param {number} [lines=3] - Number of text lines
 * @param {boolean} [withTitle=true] - Include a title skeleton
 * @returns {string}
 */
export function createSkeleton(lines = 3, withTitle = true) {
  let html = '';

  if (withTitle) {
    html += '<div class="skeleton skeleton-title"></div>';
  }

  for (let i = 0; i < lines; i++) {
    html += '<div class="skeleton skeleton-text"></div>';
  }

  return html;
}

/**
 * Create a skeleton card.
 * @returns {string}
 */
export function createSkeletonCard() {
  return `
    <div class="card">
      <div class="card-header">
        <div class="skeleton skeleton-title" style="width:40%;"></div>
      </div>
      <div class="card-body">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:60%;"></div>
      </div>
    </div>
  `;
}

/**
 * Create inline loading dots.
 * @returns {string}
 */
export function createInlineLoader() {
  return `
    <span class="inline-loader">
      <span class="inline-loader-dots">
        <span class="inline-loader-dot"></span>
        <span class="inline-loader-dot"></span>
        <span class="inline-loader-dot"></span>
      </span>
    </span>
  `;
}
