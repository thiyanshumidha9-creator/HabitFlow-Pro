/* ============================================
   HabitFlow Pro — Habits Page
   ============================================ */

import { createEmptyState } from '../components/empty-state.js';
import { renderIcons } from '../utils/icons.js';
import { modalManager } from '../components/modal.js';
import { toastManager } from '../components/toast.js';
import { $, $$, on } from '../utils/dom.js';
import { api } from '../services/api.js';

const categoryBadges = {
  health: { label: 'Health & Fitness', bg: 'var(--color-success-subtle)', color: 'var(--color-success-dark)' },
  productivity: { label: 'Productivity', bg: 'var(--color-primary-subtle)', color: 'var(--color-primary-dark)' },
  learning: { label: 'Learning', bg: 'var(--color-info-subtle)', color: 'var(--color-info-dark)' },
  mindfulness: { label: 'Mindfulness', bg: 'var(--color-warning-subtle)', color: 'var(--color-warning-dark)' },
};

/**
 * Render the Habits page.
 * @param {Element} container
 */
export async function render(container, showLoader = true) {
  // Keep the current page interactive while refreshing after a mutation.
  if (showLoader) container.innerHTML = `
    <div class="page-loader">
      <div class="spinner spinner--lg"></div>
      <div class="page-loader-text">Loading your habits...</div>
    </div>
  `;
  renderIcons();

  try {
    const response = await api.getCached('/habits');
    const habits = response.data || [];
    renderHabitsList(container, habits);
  } catch (error) {
    toastManager.error(error.message || 'Failed to load habits from backend.', 'Error');
    container.innerHTML = `
      <div class="page-enter text-center py-12">
        <h3 class="heading-3 mb-2">Error Loading Habits</h3>
        <p class="text-body-sm mb-6">${error.message || 'Please check your connection.'}</p>
        <button class="btn btn--primary" id="retry-load-habits-btn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('retry-load-habits-btn');
    if (retryBtn) {
      on(retryBtn, 'click', () => render(container));
    }
  }
}

/**
 * Renders the actual habit list or empty state.
 * @param {Element} container
 * @param {Array} habits
 */
function renderHabitsList(container, habits) {
  const habitsGridHTML = habits.length === 0
    ? `
      <div class="card card--elevated">
        <div class="card-body">
          ${createEmptyState({
            icon: 'target',
            title: 'No habits yet',
            description: 'Start building better routines by creating your first habit. Track daily, weekly, or monthly goals.',
            actionText: 'Create Habit',
            actionId: 'create-habit-btn',
          })}
        </div>
      </div>
    `
    : `
      <div class="grid-auto-fill">
        ${habits.map(habit => {
          const badge = categoryBadges[habit.category] || categoryBadges.productivity;
          const habitColor = habit.color || 'var(--color-primary)';
          const habitIcon = habit.icon || 'target';
          
          return `
            <div class="card card--elevated habit-card" data-habit-id="${habit.id}">
              <div class="card-body d-flex flex-col gap-4">
                <div class="d-flex justify-between items-start">
                  <div class="d-flex gap-3">
                    <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: ${badge.bg}; color: ${habitColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <i data-lucide="${habitIcon}" style="width:20px;height:20px;"></i>
                    </div>
                    <div>
                      <span class="badge mb-1" style="background:${badge.bg}; color:${badge.color}; font-size:var(--fs-xs); padding: 2px 8px; border-radius: var(--radius-full);">
                        ${badge.label}
                      </span>
                      <h3 class="heading-4" style="margin: 0; display: flex; align-items: center; gap: 6px;">
                        ${habit.name}
                      </h3>
                      <p class="text-body-sm text-secondary" style="font-size: var(--fs-xs); margin: 2px 0 0 0;">
                        ${habit.frequency} • Starts ${new Date(habit.start_date).toLocaleDateString()}
                      </p>
                      ${habit.description ? `<p class="text-body-sm text-tertiary mt-2" style="font-size: var(--fs-xs); margin-bottom: 0;">${habit.description}</p>` : ''}
                    </div>
                  </div>
                  <div class="d-flex gap-1">
                    <button class="btn btn--ghost btn--icon btn--sm edit-habit-btn" data-id="${habit.id}" title="Edit Habit">
                      <i data-lucide="edit-3" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn--ghost btn--icon btn--sm delete-habit-btn" data-id="${habit.id}" title="Delete Habit">
                      <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                  </div>
                </div>

                <div class="d-flex justify-between items-center pt-3" style="border-top: 1px solid var(--color-border); gap: 12px;">
                  <div class="d-flex flex-col gap-1">
                    <div class="d-flex items-center gap-1 text-warning" style="font-size: var(--fs-sm); font-weight: var(--fw-semibold);">
                      <i data-lucide="flame" style="width:18px;height:18px;"></i>
                      <span>${habit.streak || 0} Day Streak</span>
                    </div>
                    <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">
                      Completion Rate: ${habit.completion_percentage || 0}%
                    </div>
                  </div>

                  <button class="btn ${habit.is_completed_today ? 'btn--success' : 'btn--outline'} btn--sm toggle-habit-btn" data-id="${habit.id}">
                    <i data-lucide="${habit.is_completed_today ? 'check-circle-2' : 'circle'}" style="width:16px;height:16px;"></i>
                    <span>${habit.is_completed_today ? 'Done' : 'Mark Done'}</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

  container.innerHTML = `
    <div class="page-enter">
      <div class="d-flex items-center justify-between mb-6">
        <div>
          <h1 class="page-title">Habits</h1>
          <p class="page-subtitle">Create and manage your daily habits (${habits.length} total).</p>
        </div>
        <button class="btn btn--primary btn--sm" id="header-create-habit-btn">
          <i data-lucide="plus"></i>
          <span>Create Habit</span>
        </button>
      </div>

      ${habitsGridHTML}
    </div>
  `;

  renderIcons();
  bindEvents(container, habits);
}

function bindEvents(container, habits = []) {
  const openHabitModal = (existingHabit = null) => {
    const isEdit = !!existingHabit;
    const defaultDate = new Date().toISOString().split('T')[0];
    
    const modalId = modalManager.open({
      title: isEdit ? 'Edit Habit' : 'Create New Habit',
      body: `
        <form id="modal-habit-form" class="d-flex flex-col gap-4">
          <div class="form-group">
            <label class="form-label form-label-required" for="modal-habit-name">Habit Name</label>
            <input type="text" class="form-input" id="modal-habit-name" placeholder="e.g. Morning Meditation, Read 20 mins..." value="${isEdit ? existingHabit.name : ''}" required />
          </div>
          
          <div class="form-group">
            <label class="form-label" for="modal-habit-desc">Description</label>
            <input type="text" class="form-input" id="modal-habit-desc" placeholder="Brief notes or reminders..." value="${isEdit && existingHabit.description ? existingHabit.description : ''}" />
          </div>

          <div class="row">
            <div class="col-6">
              <div class="form-group">
                <label class="form-label form-label-required" for="modal-habit-category">Category</label>
                <select class="form-input" id="modal-habit-category">
                  <option value="productivity" ${isEdit && existingHabit.category === 'productivity' ? 'selected' : ''}>Productivity</option>
                  <option value="health" ${isEdit && existingHabit.category === 'health' ? 'selected' : ''}>Health & Fitness</option>
                  <option value="learning" ${isEdit && existingHabit.category === 'learning' ? 'selected' : ''}>Learning</option>
                  <option value="mindfulness" ${isEdit && existingHabit.category === 'mindfulness' ? 'selected' : ''}>Mindfulness & Wellness</option>
                </select>
              </div>
            </div>
            <div class="col-6">
              <div class="form-group">
                <label class="form-label form-label-required" for="modal-habit-frequency">Frequency</label>
                <select class="form-input" id="modal-habit-frequency">
                  <option value="Daily" ${isEdit && existingHabit.frequency === 'Daily' ? 'selected' : ''}>Daily</option>
                  <option value="Weekly" ${isEdit && existingHabit.frequency === 'Weekly' ? 'selected' : ''}>Weekly</option>
                  <option value="Monthly" ${isEdit && existingHabit.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
                </select>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-12">
              <div class="form-group">
                <label class="form-label form-label-required" for="modal-habit-start">Start Date</label>
                <input type="date" class="form-input" id="modal-habit-start" value="${isEdit ? existingHabit.start_date : defaultDate}" required />
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-6">
              <div class="form-group">
                <label class="form-label" for="modal-habit-icon">Icon</label>
                <select class="form-input" id="modal-habit-icon">
                  <option value="target" ${isEdit && existingHabit.icon === 'target' ? 'selected' : ''}>Target</option>
                  <option value="activity" ${isEdit && existingHabit.icon === 'activity' ? 'selected' : ''}>Activity</option>
                  <option value="flame" ${isEdit && existingHabit.icon === 'flame' ? 'selected' : ''}>Flame</option>
                  <option value="book-open" ${isEdit && existingHabit.icon === 'book-open' ? 'selected' : ''}>Book</option>
                  <option value="sparkles" ${isEdit && existingHabit.icon === 'sparkles' ? 'selected' : ''}>Sparkles</option>
                </select>
              </div>
            </div>
            <div class="col-6">
              <div class="form-group">
                <label class="form-label" for="modal-habit-color">Color</label>
                <select class="form-input" id="modal-habit-color">
                  <option value="var(--color-primary)" ${isEdit && existingHabit.color === 'var(--color-primary)' ? 'selected' : ''}>Blue</option>
                  <option value="var(--color-success)" ${isEdit && existingHabit.color === 'var(--color-success)' ? 'selected' : ''}>Green</option>
                  <option value="var(--color-warning)" ${isEdit && existingHabit.color === 'var(--color-warning)' ? 'selected' : ''}>Orange</option>
                  <option value="var(--color-danger)" ${isEdit && existingHabit.color === 'var(--color-danger)' ? 'selected' : ''}>Red</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn--secondary btn--sm" data-modal-close>Cancel</button>
        <button type="button" class="btn btn--primary btn--sm" id="modal-save-habit-btn">${isEdit ? 'Save Changes' : 'Create Habit'}</button>
      `
    });

    setTimeout(() => {
      const saveBtn = document.getElementById('modal-save-habit-btn');
      if (saveBtn) {
        on(saveBtn, 'click', async () => {
          const nameInput = document.getElementById('modal-habit-name');
          const descInput = document.getElementById('modal-habit-desc');
          const categorySelect = document.getElementById('modal-habit-category');
          const freqSelect = document.getElementById('modal-habit-frequency');
          const startInput = document.getElementById('modal-habit-start');
          const iconSelect = document.getElementById('modal-habit-icon');
          const colorSelect = document.getElementById('modal-habit-color');

          if (!nameInput || !nameInput.value.trim()) {
            toastManager.error('Please enter a habit name.', 'Validation Error');
            return;
          }
          if (!startInput || !startInput.value) {
            toastManager.error('Please select a start date.', 'Validation Error');
            return;
          }

          const payload = {
            name: nameInput.value.trim(),
            description: descInput ? descInput.value.trim() : null,
            category: categorySelect ? categorySelect.value : 'productivity',
            frequency: freqSelect ? freqSelect.value : 'Daily',
            start_date: startInput.value,
            icon: iconSelect ? iconSelect.value : 'target',
            color: colorSelect ? colorSelect.value : 'var(--color-primary)'
          };

          try {
            saveBtn.disabled = true;
            saveBtn.classList.add('loading');
            
            if (isEdit) {
              await api.put(`/habits/${existingHabit.id}`, payload);
              toastManager.success(`"${payload.name}" updated successfully!`, 'Habit Updated');
            } else {
              await api.post('/habits', payload);
              toastManager.success(`"${payload.name}" created successfully!`, 'Habit Created');
            }
            
            modalManager.close(modalId);
            render(container, false);
          } catch (err) {
            toastManager.error(err.message || 'Failed to save habit details.', 'Error');
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
          }
        });
      }
    }, 50);
  };

  // Add click handlers for page action buttons
  const createBtn = $('#create-habit-btn', container);
  if (createBtn) {
    on(createBtn, 'click', (e) => {
      e.stopPropagation();
      openHabitModal();
    });
  }

  const headerBtn = $('#header-create-habit-btn', container);
  if (headerBtn) {
    on(headerBtn, 'click', (e) => {
      e.stopPropagation();
      openHabitModal();
    });
  }

  // Edit action
  $$('.edit-habit-btn', container).forEach(btn => {
    on(btn, 'click', () => {
      const id = btn.getAttribute('data-id');
      const habit = habits.find(h => h.id === id);
      if (habit) openHabitModal(habit);
    });
  });

  // Toggle completion
  $$('.toggle-habit-btn', container).forEach(btn => {
    on(btn, 'click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        btn.disabled = true;
        btn.classList.add('loading');
        await api.post(`/habits/${id}/toggle`, {});
        toastManager.success('Habit completion status updated.', 'Success');
        render(container, false);
      } catch (err) {
        toastManager.error(err.message || 'Failed to update habit completion status.', 'Error');
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });
  });

  // Delete habit
  $$('.delete-habit-btn', container).forEach(btn => {
    on(btn, 'click', async () => {
      const id = btn.getAttribute('data-id');
      const habit = habits.find(h => h.id === id);
      const name = habit ? habit.name : 'this habit';
      
      if (confirm(`Are you sure you want to delete "${name}"?`)) {
        try {
          btn.disabled = true;
          await api.delete(`/habits/${id}`);
          toastManager.info(`"${name}" deleted.`, 'Deleted');
          render(container, false);
        } catch (err) {
          toastManager.error(err.message || 'Failed to delete habit.', 'Error');
          btn.disabled = false;
        }
      }
    });
  });
}
