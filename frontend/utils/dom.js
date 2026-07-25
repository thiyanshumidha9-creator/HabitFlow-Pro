/* ============================================
   HabitFlow Pro — DOM Utilities
   ============================================
   Lightweight helpers for DOM manipulation.
   ============================================ */

/**
 * Select a single element.
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element
 * @returns {Element|null}
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * Select all matching elements.
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element
 * @returns {Element[]}
 */
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * Create an element with optional attributes and children.
 * @param {string} tag - HTML tag name
 * @param {Object} [attrs={}] - Attributes / properties
 * @param  {...(string|Element)} children - Child nodes or text
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'innerHTML') {
      el.innerHTML = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Add event listener.
 * @param {Element} el
 * @param {string} event
 * @param {Function} handler
 * @param {Object} [options]
 */
export function on(el, event, handler, options) {
  el.addEventListener(event, handler, options);
}

/**
 * Remove event listener.
 * @param {Element} el
 * @param {string} event
 * @param {Function} handler
 * @param {Object} [options]
 */
export function off(el, event, handler, options) {
  el.removeEventListener(event, handler, options);
}

/**
 * Delegate events — listen on a parent and match child selectors.
 * @param {Element} parent
 * @param {string} event
 * @param {string} selector
 * @param {Function} handler
 */
export function delegate(parent, event, selector, handler) {
  parent.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler(e, target);
    }
  });
}

/**
 * Set innerHTML safely and return the element.
 * @param {Element} el
 * @param {string} html
 * @returns {Element}
 */
export function setHTML(el, html) {
  el.innerHTML = html;
  return el;
}

/**
 * Toggle a class on an element.
 * @param {Element} el
 * @param {string} className
 * @param {boolean} [force]
 */
export function toggleClass(el, className, force) {
  el.classList.toggle(className, force);
}
