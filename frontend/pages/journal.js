/* ============================================
   HabitFlow Pro — Journal Page
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';
import { modalManager } from '../components/modal.js';
import { toastManager } from '../components/toast.js';
import { $, $$, on } from '../utils/dom.js';
import { api } from '../services/api.js';

const MOOD_MAP = {
  Happy: { label: 'Happy', emoji: '😊', bg: 'var(--color-success-subtle)', color: 'var(--color-success-dark)' },
  Neutral: { label: 'Neutral', emoji: '😐', bg: 'var(--color-info-subtle)', color: 'var(--color-info-dark)' },
  Sad: { label: 'Sad', emoji: '😔', bg: 'var(--color-warning-subtle)', color: 'var(--color-warning-dark)' },
};

let currentSearchQuery = '';

/**
 * Render the Journal page.
 * @param {Element} container
 */
export async function render(container, showLoader = true) {
  // Keep the current page interactive while refreshing after a mutation.
  if (showLoader) container.innerHTML = `
    <div class="page-loader">
      <div class="spinner spinner--lg"></div>
      <div class="page-loader-text">Loading your journal...</div>
    </div>
  `;
  renderIcons();

  try {
    const response = await api.getCached('/journals');
    const entries = response.data || [];
    renderJournalList(container, entries);
  } catch (error) {
    console.warn('Failed to load journals from API, attempting local fallback:', error);
    try {
      const raw = localStorage.getItem('habitflow_journal_data');
      const fallbackEntries = raw ? JSON.parse(raw) : [];
      renderJournalList(container, fallbackEntries);
    } catch (e) {
      toastManager.error(error.message || 'Failed to load journal entries.', 'Error');
      container.innerHTML = `
        <div class="page-enter text-center py-12">
          <h3 class="heading-3 mb-2">Error Loading Journal</h3>
          <p class="text-body-sm mb-6">${error.message || 'Please check your connection.'}</p>
          <button class="btn btn--primary" id="retry-load-journal-btn">Retry</button>
        </div>
      `;
      const retryBtn = document.getElementById('retry-load-journal-btn');
      if (retryBtn) {
        on(retryBtn, 'click', () => render(container));
      }
    }
  }
}

/**
 * Renders the journal page UI with search, list, and modals.
 * @param {Element} container
 * @param {Array} allEntries
 */
function renderJournalList(container, allEntries, listOnly = false) {
  // Filter entries based on search query
  const query = currentSearchQuery.trim().toLowerCase();
  const entries = allEntries.filter(entry => {
    if (!query) return true;
    const titleMatch = entry.title?.toLowerCase().includes(query);
    const contentMatch = entry.content?.toLowerCase().includes(query);
    const tagsMatch = entry.tags?.toLowerCase().includes(query);
    const dateMatch = entry.entry_date?.toLowerCase().includes(query);
    return titleMatch || contentMatch || tagsMatch || dateMatch;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const entriesGridHTML = entries.length === 0
    ? `
      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
      icon: 'book-open',
      title: query ? 'No matching journal entries found' : 'Your journal is empty',
      description: query
        ? `No entries match "${currentSearchQuery}". Try a different keyword, tag, or date.`
        : 'Write daily reflections to complement your habit tracking. Capture wins, struggles, and insights.',
      actionText: query ? undefined : 'New Entry',
      actionId: query ? undefined : 'new-journal-btn',
    })}
        </div>
      </div>
    `
    : `
      <div class="d-flex flex-col gap-4">
        ${entries.map(entry => {
      const entryDateObj = entry.entry_date ? new Date(entry.entry_date + 'T00:00:00') : new Date(entry.created_at || Date.now());
      const dateDisplayStr = entryDateObj.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });

      const moodInfo = MOOD_MAP[entry.mood] || MOOD_MAP.Happy;
      const tagList = entry.tags ? entry.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      return `
            <div class="card card--elevated journal-entry-card" data-id="${entry.id}">
              <div class="card-body d-flex flex-col gap-3">
                <div class="d-flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div class="d-flex items-center gap-2 mb-1 flex-wrap">
                      <h3 class="heading-4" style="margin: 0;">${escapeHtml(entry.title)}</h3>
                      ${entry.mood ? `
                        <span style="background: ${moodInfo.bg}; color: ${moodInfo.color}; padding: 2px 8px; border-radius: 12px; font-size: var(--fs-xs); font-weight: 600;">
                          ${moodInfo.emoji} ${moodInfo.label}
                        </span>
                      ` : ''}
                    </div>
                    <span class="text-caption text-tertiary" style="font-size: var(--fs-xs); display: flex; align-items: center; gap: 4px;">
                      <i data-lucide="calendar" style="width:14px;height:14px;"></i>
                      ${dateDisplayStr}
                    </span>
                  </div>
                  <div class="d-flex items-center gap-1">
                    <button class="btn btn--ghost btn--icon btn--sm edit-journal-btn" data-id="${entry.id}" title="Edit Entry">
                      <i data-lucide="edit-3" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn--ghost btn--icon btn--sm delete-journal-btn" data-id="${entry.id}" title="Delete Entry">
                      <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                  </div>
                </div>

                <p class="text-body" style="white-space: pre-wrap; line-height: var(--lh-relaxed); color: var(--text-secondary); margin: 0;">${escapeHtml(entry.content)}</p>

                ${tagList.length > 0 ? `
                  <div class="d-flex items-center gap-2 flex-wrap pt-2" style="border-top: 1px dashed var(--color-border);">
                    <i data-lucide="tag" style="width:14px;height:14px; color: var(--text-tertiary);"></i>
                    ${tagList.map(tag => `
                      <span class="journal-tag-pill" data-tag="${escapeHtml(tag)}" style="background: var(--color-bg-secondary); color: var(--color-primary); padding: 2px 10px; border-radius: 16px; font-size: var(--fs-xs); font-weight: 500; cursor: pointer;">
                        #${escapeHtml(tag)}
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;

  if (listOnly) {
    const resultsContainer = $('#journal-results', container);
    if (resultsContainer) {
      resultsContainer.innerHTML = entriesGridHTML;
      renderIcons();
      bindEvents(resultsContainer, allEntries, container);
    }

    const clearBtn = $('#clear-search-btn', container);
    if (clearBtn) clearBtn.hidden = !currentSearchQuery;
    return;
  }

  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="page-title">Journal</h1>
          <p class="page-subtitle">Reflect on your journey and track your thoughts (${allEntries.length} total entries).</p>
        </div>
        <button class="btn btn--primary btn--sm" id="header-new-journal-btn">
          <i data-lucide="plus"></i>
          <span>New Entry</span>
        </button>
      </div>

      <!-- Search & Filter Bar -->
      <div class="card card--elevated mb-6">
        <div class="card-body py-3 px-4">
          <div class="d-flex items-center gap-3 flex-wrap">
            <div style="position: relative; flex: 1; min-width: 240px;">
              <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-tertiary);"></i>
              <input type="text" id="journal-search-input" class="form-input" style="padding-left: 36px;" placeholder="Search title, content, tag, date (YYYY-MM-DD)..." value="${escapeHtml(currentSearchQuery)}" />
            </div>
            <button class="btn btn--outline btn--sm" id="clear-search-btn"${currentSearchQuery ? '' : ' hidden'}>Clear Search</button>
          </div>
        </div>
      </div>

      <div id="journal-results">
        ${entriesGridHTML}
      </div>
    </div>
  `;

  renderIcons();
  bindEvents(container, allEntries);
}

function bindEvents(container, allEntries, pageContainer = container) {
  // Search input handler
  const searchInput = $('#journal-search-input', container);
  if (searchInput) {
    on(searchInput, 'input', (e) => {
      currentSearchQuery = e.target.value;
      renderJournalList(pageContainer, allEntries, true);
    });
  }

  const clearBtn = $('#clear-search-btn', container);
  if (clearBtn) {
    on(clearBtn, 'click', () => {
      currentSearchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      renderJournalList(pageContainer, allEntries, true);
    });
  }

  // Tag click filter handler
  $$('.journal-tag-pill', container).forEach(pill => {
    on(pill, 'click', (e) => {
      e.stopPropagation();
      const tag = pill.getAttribute('data-tag');
      currentSearchQuery = tag;
      const pageSearchInput = $('#journal-search-input', pageContainer);
      if (pageSearchInput) pageSearchInput.value = tag;
      renderJournalList(pageContainer, allEntries, true);
    });
  });

  // Open Create/Edit modal helper
  const openJournalModal = (existingEntry = null) => {
    const isEdit = !!existingEntry;
    const todayStr = new Date().toISOString().split('T')[0];

    const modalId = modalManager.open({
      title: isEdit ? 'Edit Journal Entry' : 'New Journal Entry',
      body: `
        <form id="modal-journal-form" class="d-flex flex-col gap-4">
          <div class="form-group">
            <label class="form-label form-label-required" for="modal-journal-title">Title</label>
            <input type="text" class="form-input" id="modal-journal-title" placeholder="What's on your mind today?" value="${existingEntry ? escapeHtml(existingEntry.title) : ''}" required />
          </div>

          <div class="form-group">
            <label class="form-label form-label-required" for="modal-journal-content">Reflections</label>
            <textarea class="form-input" id="modal-journal-content" rows="5" placeholder="Write your thoughts, wins, and insights..." style="resize: vertical;" required>${existingEntry ? escapeHtml(existingEntry.content) : ''}</textarea>
          </div>

          <div class="grid-2-col gap-3">
            <div class="form-group">
              <label class="form-label" for="modal-journal-mood">Mood</label>
              <select class="form-input" id="modal-journal-mood">
                <option value="Happy" ${existingEntry?.mood === 'Happy' || !existingEntry ? 'selected' : ''}>😊 Happy</option>
                <option value="Neutral" ${existingEntry?.mood === 'Neutral' ? 'selected' : ''}>😐 Neutral</option>
                <option value="Sad" ${existingEntry?.mood === 'Sad' ? 'selected' : ''}>😔 Sad</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="modal-journal-date">Entry Date</label>
              <input type="date" class="form-input" id="modal-journal-date" value="${existingEntry?.entry_date || todayStr}" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-journal-tags">Tags (optional)</label>
            <input type="text" class="form-input" id="modal-journal-tags" placeholder="e.g. mindfulness, wins, reflection (comma separated)" value="${existingEntry?.tags ? escapeHtml(existingEntry.tags) : ''}" />
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn--secondary btn--sm" data-modal-close>Cancel</button>
        <button type="button" class="btn btn--primary btn--sm" id="modal-save-journal-btn">${isEdit ? 'Update Entry' : 'Save Entry'}</button>
      `
    });

    setTimeout(() => {
      const saveBtn = document.getElementById('modal-save-journal-btn');
      if (saveBtn) {
        on(saveBtn, 'click', async (e) => {
          e.preventDefault();
          const titleInput = document.getElementById('modal-journal-title');
          const contentInput = document.getElementById('modal-journal-content');
          const moodInput = document.getElementById('modal-journal-mood');
          const dateInput = document.getElementById('modal-journal-date');
          const tagsInput = document.getElementById('modal-journal-tags');

          if (!titleInput || !contentInput || !titleInput.value.trim() || !contentInput.value.trim()) {
            toastManager.error('Please fill in both title and reflections.', 'Validation Error');
            return;
          }

          const payload = {
            title: titleInput.value.trim(),
            content: contentInput.value.trim(),
            mood: moodInput ? moodInput.value : 'Happy',
            entry_date: dateInput ? dateInput.value : todayStr,
            tags: tagsInput ? tagsInput.value.trim() : null
          };

          try {
            if (isEdit) {
              await api.put(`/journals/${existingEntry.id}`, payload);
              toastManager.success(`"${payload.title}" updated!`, 'Entry Updated');
            } else {
              await api.post('/journals', payload);
              toastManager.success(`"${payload.title}" saved!`, 'Entry Created');
            }
            modalManager.close(modalId);
            render(pageContainer, false);
          } catch (err) {
            console.error('Failed saving journal entry:', err);
            // Fallback for offline/local storage save
            try {
              const raw = localStorage.getItem('habitflow_journal_data');
              let entries = raw ? JSON.parse(raw) : [];
              if (isEdit) {
                entries = entries.map(ent => ent.id === existingEntry.id ? { ...ent, ...payload } : ent);
              } else {
                entries.unshift({ id: `journal-${Date.now()}`, ...payload, created_at: new Date().toISOString() });
              }
              localStorage.setItem('habitflow_journal_data', JSON.stringify(entries));
              modalManager.close(modalId);
              toastManager.success(`"${payload.title}" saved locally!`, 'Saved');
              render(pageContainer, false);
            } catch (fallbackErr) {
              toastManager.error(err.message || 'Failed to save entry.', 'Error');
            }
          }
        });
      }
    }, 50);
  };

  const newBtn = $('#new-journal-btn', container);
  if (newBtn) {
    on(newBtn, 'click', (e) => {
      e.stopPropagation();
      openJournalModal();
    });
  }

  const headerBtn = $('#header-new-journal-btn', container);
  if (headerBtn) {
    on(headerBtn, 'click', (e) => {
      e.stopPropagation();
      openJournalModal();
    });
  }

  // Edit entry buttons
  $$('.edit-journal-btn', container).forEach(btn => {
    on(btn, 'click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const entry = allEntries.find(e => String(e.id) === String(id));
      if (entry) {
        openJournalModal(entry);
      }
    });
  });

  // Delete entry buttons
  $$('.delete-journal-btn', container).forEach(btn => {
    on(btn, 'click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const entry = allEntries.find(e => String(e.id) === String(id));
      const entryTitle = entry ? entry.title : 'Entry';

      if (confirm(`Are you sure you want to delete "${entryTitle}"?`)) {
        try {
          await api.delete(`/journals/${id}`);
          toastManager.info(`"${entryTitle}" deleted.`, 'Deleted');
          render(container, false);
        } catch (err) {
          console.warn('Failed API deletion, applying local deletion fallback:', err);
          try {
            const raw = localStorage.getItem('habitflow_journal_data');
            let entries = raw ? JSON.parse(raw) : [];
            entries = entries.filter(e => String(e.id) !== String(id));
            localStorage.setItem('habitflow_journal_data', JSON.stringify(entries));
            toastManager.info(`"${entryTitle}" deleted.`, 'Deleted');
            render(pageContainer, false);
          } catch (e) {
            toastManager.error('Failed to delete entry.', 'Error');
          }
        }
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
