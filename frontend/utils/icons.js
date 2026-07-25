/* ============================================
   HabitFlow Pro — Icon Helper
   ============================================
   Thin wrapper around Lucide icons CDN.
   Uses the lucide global object injected via
   the CDN script tag in index.html.
   ============================================ */

/**
 * Get an SVG icon string from Lucide.
 * Falls back to an empty span if the icon is not found.
 *
 * @param {string} name - Lucide icon name (e.g., 'home', 'bar-chart-2')
 * @param {Object} [options={}] - Override SVG attributes
 * @param {number} [options.size=20] - Icon size in px
 * @param {string} [options.strokeWidth='2'] - Stroke width
 * @param {string} [options.class=''] - Additional CSS class
 * @returns {string} SVG markup string
 */
export function icon(name, options = {}) {
  const {
    size = 20,
    strokeWidth = '2',
    class: className = '',
  } = options;

  // lucide is loaded globally from CDN
  if (typeof lucide !== 'undefined' && lucide.icons && lucide.icons[name]) {
    const [tag, attrs, children] = lucide.icons[name];
    const svgAttrs = {
      ...attrs,
      width: size,
      height: size,
      'stroke-width': strokeWidth,
      class: `lucide lucide-${name} ${className}`.trim(),
    };

    const attrStr = Object.entries(svgAttrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    const childStr = children
      .map(([childTag, childAttrs]) => {
        const childAttrStr = Object.entries(childAttrs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        return `<${childTag} ${childAttrStr} />`;
      })
      .join('');

    return `<svg ${attrStr}>${childStr}</svg>`;
  }

  // Fallback: render a placeholder
  return `<span class="icon-placeholder ${className}" style="display:inline-block;width:${size}px;height:${size}px;" aria-hidden="true"></span>`;
}

/**
 * Render all [data-lucide] attributes on the page.
 * Call this after dynamic content insertion.
 */
export function renderIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}
