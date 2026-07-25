/* ============================================
   HabitFlow Pro — Footer Component
   ============================================ */

class Footer {
  /**
   * Render the footer.
   * @param {Element} container
   */
  render(container) {
    const year = new Date().getFullYear();

    container.innerHTML = `
      <footer class="app-footer" role="contentinfo">
        <span class="app-footer-text">© ${year} HabitFlow Pro. All rights reserved.</span>
        <span class="app-footer-version">v1.0.0</span>
      </footer>
    `;
  }
}

// Singleton export
export const footer = new Footer();
