/* ============================================
   HabitFlow Pro — App Layout
   ============================================
   Composes Sidebar + TopNav + Page Container +
   Footer into the main application shell.
   ============================================ */

import { sidebar } from '../components/sidebar.js';
import { topNav } from '../components/topnav.js';
import { footer } from '../components/footer.js';
import { $ } from '../utils/dom.js';

class AppLayout {
  constructor() {
    this._sidebarContainer = null;
    this._topnavContainer = null;
    this._contentContainer = null;
    this._footerContainer = null;
    this._mainEl = null;
  }

  /**
   * Mount the full app layout into #app.
   * @param {Element} root - The #app root element
   */
  mount(root) {
    root.innerHTML = `
      <div class="app-layout" id="app-layout">
        <!-- Sidebar renders here -->
        <div id="sidebar-mount"></div>

        <!-- Main content area -->
        <main class="app-main" id="app-main" role="main">
          <!-- TopNav renders here -->
          <div id="topnav-mount"></div>

          <!-- Page content renders here -->
          <div class="app-content" id="app-content">
            <!-- Pages load into this container -->
          </div>

          <!-- Footer renders here -->
          <div id="footer-mount"></div>
        </main>
      </div>
    `;

    this._sidebarContainer = $('#sidebar-mount', root);
    this._topnavContainer = $('#topnav-mount', root);
    this._contentContainer = $('#app-content', root);
    this._footerContainer = $('#footer-mount', root);
    this._mainEl = $('#app-main', root);

    // Render sub-components
    sidebar.render(this._sidebarContainer);
    topNav.render(this._topnavContainer, {
      onHamburgerClick: () => sidebar.openMobile(),
    });
    footer.render(this._footerContainer);

    // Listen for sidebar collapse to adjust main margin
    window.addEventListener('sidebar:toggle', (e) => {
      if (this._mainEl) {
        this._mainEl.classList.toggle('sidebar-collapsed', e.detail.collapsed);
      }
    });
  }

  /**
   * Get the page content container for the router to render into.
   * @returns {Element}
   */
  getContentContainer() {
    return this._contentContainer;
  }

  /**
   * Update the page title in the top nav.
   * @param {string} title
   */
  setPageTitle(title) {
    topNav.setTitle(title);
  }

  /**
   * Toggle between App Mode (navigation/sidebar visible) and Auth Mode (login/signup screens centered).
   * @param {boolean} isAuthPage
   */
  setAuthMode(isAuthPage) {
    if (!this._mainEl) return;

    const layout = document.getElementById('app-layout');

    if (isAuthPage) {
      if (layout) layout.classList.add('auth-layout');
      this._mainEl.style.marginLeft = '0';
      if (this._sidebarContainer) this._sidebarContainer.style.display = 'none';
      if (this._topnavContainer) this._topnavContainer.style.display = 'none';
      if (this._footerContainer) this._footerContainer.style.display = 'none';
    } else {
      if (layout) layout.classList.remove('auth-layout');
      this._mainEl.style.marginLeft = '';
      this._mainEl.className = sidebar.isCollapsed ? 'app-main sidebar-collapsed' : 'app-main';
      if (this._sidebarContainer) this._sidebarContainer.style.display = '';
      if (this._topnavContainer) this._topnavContainer.style.display = '';
      if (this._footerContainer) this._footerContainer.style.display = '';
    }
  }

  /**
   * Set the active sidebar item.
   * @param {string} route
   */
  setActiveRoute(route) {
    sidebar.setActive(route);
  }
}

// Singleton export
export const appLayout = new AppLayout();
