/* ============================================
   HabitFlow Pro — Calendar Page
   ============================================ */

import { createCard } from '../components/card.js';
import { renderIcons } from '../utils/icons.js';
import { modalManager } from '../components/modal.js';
import { toastManager } from '../components/toast.js';
import { $, $$, on } from '../utils/dom.js';
import { api } from '../services/api.js';

let viewDate = new Date(); // Currently displayed month
let selectedDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

/**
 * Render the Calendar page.
 * @param {Element} container
 */
export async function render(container) {
  container.innerHTML = `
    <div class="page-loader">
      <div class="spinner spinner--lg"></div>
      <div class="page-loader-text">Loading calendar data...</div>
    </div>
  `;
  renderIcons();

  try {
    const [habitsRes, journalsRes, logsRes] = await Promise.all([
      api.getCached('/habits').catch(() => ({ data: [] })),
      api.getCached('/journals').catch(() => ({ data: [] })),
      api.getCached('/habits/logs').catch(() => ({ data: [] })),
    ]);

    const habits = habitsRes.data || [];
    const journals = journalsRes.data || [];
    const habitLogs = logsRes.data || [];

    renderCalendarView(container, habits, journals, habitLogs);
  } catch (error) {
    console.error('Error loading calendar data:', error);
    toastManager.error('Failed to load calendar data.', 'Error');
    renderCalendarView(container, [], [], []);
  }
}

/**
 * Render the complete calendar monthly grid and selected date details.
 */
function renderCalendarView(container, habits, journals, habitLogs) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const todayStr = new Date().toISOString().split('T')[0];

  // Build maps for quick lookup by date string (YYYY-MM-DD)
  // 1. Journal entries by entry_date
  const journalMap = {};
  journals.forEach(j => {
    const dStr = j.entry_date || (j.created_at ? j.created_at.split('T')[0] : '');
    if (dStr) {
      if (!journalMap[dStr]) journalMap[dStr] = [];
      journalMap[dStr].push(j);
    }
  });

  // 2. Completed habits by date
  const completedHabitsMap = {};
  // From habit logs table
  habitLogs.forEach(log => {
    const dStr = log.completed_date;
    if (dStr) {
      if (!completedHabitsMap[dStr]) completedHabitsMap[dStr] = new Set();
      completedHabitsMap[dStr].add(log.habit_id);
    }
  });

  // Also include today's completed habits from Habits table
  habits.forEach(h => {
    if (h.is_completed_today) {
      if (!completedHabitsMap[todayStr]) completedHabitsMap[todayStr] = new Set();
      completedHabitsMap[todayStr].add(h.id);
    }
    if (h.last_completed_date) {
      const dStr = h.last_completed_date;
      if (!completedHabitsMap[dStr]) completedHabitsMap[dStr] = new Set();
      completedHabitsMap[dStr].add(h.id);
    }
  });

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Create grid cells
  const dayCells = [];

  // Previous month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    dayCells.push({
      dayNum,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;

    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDateStr;

    const dayJournals = journalMap[dateStr] || [];
    const completedHabitIds = completedHabitsMap[dateStr] ? Array.from(completedHabitsMap[dateStr]) : [];

    dayCells.push({
      dayNum: day,
      isCurrentMonth: true,
      dateStr,
      isToday,
      isSelected,
      hasJournal: dayJournals.length > 0,
      journalCount: dayJournals.length,
      hasHabits: completedHabitIds.length > 0,
      habitCount: completedHabitIds.length,
    });
  }

  // Next month padding days to fill 42 cells grid (6 rows of 7)
  const remainingCells = 42 - dayCells.length;
  for (let day = 1; day <= remainingCells; day++) {
    dayCells.push({
      dayNum: day,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  // Selected date details
  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  const selectedDateHeaderStr = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const selectedJournals = journalMap[selectedDateStr] || [];
  const selectedCompletedHabitIds = completedHabitsMap[selectedDateStr] ? Array.from(completedHabitsMap[selectedDateStr]) : [];
  const selectedCompletedHabits = habits.filter(h => selectedCompletedHabitIds.includes(h.id));

  // Max streak count across habits
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="d-flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="page-title">Calendar & History</h1>
          <p class="page-subtitle">View habit completions, journal entries, and progress history</p>
        </div>
        <div class="d-flex items-center gap-2">
          <button class="btn btn--outline btn--sm" id="cal-prev-month-btn" title="Previous Month">
            <i data-lucide="chevron-left"></i>
          </button>
          <span style="font-weight: 600; font-size: var(--fs-md); min-width: 140px; text-align: center;">
            ${monthName} ${year}
          </span>
          <button class="btn btn--outline btn--sm" id="cal-next-month-btn" title="Next Month">
            <i data-lucide="chevron-right"></i>
          </button>
          <button class="btn btn--secondary btn--sm ms-2" id="cal-today-btn">Today</button>
        </div>
      </div>

      <!-- Calendar Legend -->
      <div class="d-flex items-center gap-4 mb-4 text-sm flex-wrap">
        <div class="d-flex items-center gap-2">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--color-success);"></span>
          <span class="text-caption">Habits Completed</span>
        </div>
        <div class="d-flex items-center gap-2">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary);"></span>
          <span class="text-caption">Journal Entry</span>
        </div>
        <div class="d-flex items-center gap-2">
          <span style="width: 12px; height: 12px; border-radius: 3px; border: 2px solid var(--color-primary);"></span>
          <span class="text-caption">Today</span>
        </div>
      </div>

      <!-- Monthly Calendar Grid Card -->
      <div class="card card--elevated mb-6">
        <div class="card-body p-4">
          <!-- Days of week header -->
          <div class="calendar-grid-header" style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 600; color: var(--text-tertiary); font-size: var(--fs-xs); margin-bottom: 8px;">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <!-- Calendar Days Grid -->
          <div class="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
            ${dayCells.map(cell => {
              if (!cell.isCurrentMonth) {
                return `
                  <div style="min-height: 70px; padding: 6px; border-radius: 8px; background: var(--color-bg-subtle); color: var(--text-tertiary); opacity: 0.4; font-size: var(--fs-xs);">
                    ${cell.dayNum}
                  </div>
                `;
              }

              let borderStyle = '1px solid var(--color-border)';
              let bgStyle = 'var(--color-bg-surface)';

              if (cell.isSelected) {
                borderStyle = '2px solid var(--color-primary)';
                bgStyle = 'var(--color-primary-subtle)';
              } else if (cell.isToday) {
                borderStyle = '2px solid var(--color-primary)';
              }

              return `
                <div class="cal-day-cell" data-date="${cell.dateStr}" style="min-height: 70px; padding: 6px; border-radius: 8px; border: ${borderStyle}; background: ${bgStyle}; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.15s ease;">
                  <div class="d-flex justify-between items-center">
                    <span style="font-weight: ${cell.isToday ? '700' : '500'}; font-size: var(--fs-xs); ${cell.isToday ? 'color: var(--color-primary);' : ''}">
                      ${cell.dayNum}
                    </span>
                    ${cell.isToday ? '<span style="font-size: 9px; font-weight: 700; background: var(--color-primary); color: white; padding: 1px 4px; border-radius: 4px;">TODAY</span>' : ''}
                  </div>

                  <div class="d-flex items-center gap-1 mt-1 flex-wrap">
                    ${cell.hasHabits ? `
                      <span class="badge-dot-success" title="${cell.habitCount} habits completed" style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--color-success-subtle); color: var(--color-success-dark); font-size: 10px; font-weight: 700;">
                        ✓
                      </span>
                    ` : ''}
                    ${cell.hasJournal ? `
                      <span class="badge-dot-primary" title="${cell.journalCount} journal entry" style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--color-primary-subtle); color: var(--color-primary-dark); font-size: 10px; font-weight: 700;">
                        📖
                      </span>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Selected Date Breakdown Details -->
      <div class="card card--elevated">
        <div class="card-header d-flex justify-between items-center">
          <h3 class="heading-4" style="margin: 0;">Activity Details for ${selectedDateHeaderStr}</h3>
          <span class="badge badge--primary">Active Streak: ${maxStreak} 🔥</span>
        </div>
        <div class="card-body">
          <div class="grid-2-col gap-4">
            <!-- Completed Habits Column -->
            <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 8px;">
              <h4 class="heading-5 mb-3 d-flex items-center gap-2">
                <i data-lucide="check-circle-2" style="color: var(--color-success);"></i>
                Completed Habits (${selectedCompletedHabits.length})
              </h4>
              ${selectedCompletedHabits.length === 0 ? `
                <p class="text-caption text-tertiary">No habits completed on this date.</p>
              ` : `
                <ul class="d-flex flex-col gap-2" style="list-style: none; padding: 0; margin: 0;">
                  ${selectedCompletedHabits.map(h => `
                    <li style="background: var(--color-bg-surface); padding: 10px 12px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-weight: 500;">${escapeHtml(h.name)}</span>
                      <span class="badge badge--success">${escapeHtml(h.category)}</span>
                    </li>
                  `).join('')}
                </ul>
              `}
            </div>

            <!-- Journal Entry Column -->
            <div style="background: var(--color-bg-secondary); padding: 16px; border-radius: 8px;">
              <h4 class="heading-5 mb-3 d-flex items-center gap-2">
                <i data-lucide="book-open" style="color: var(--color-primary);"></i>
                Journal Entry (${selectedJournals.length})
              </h4>
              ${selectedJournals.length === 0 ? `
                <p class="text-caption text-tertiary mb-3">No journal entry written for this date.</p>
                <a href="#/journal" class="btn btn--outline btn--sm">Write Journal</a>
              ` : `
                <div class="d-flex flex-col gap-2">
                  ${selectedJournals.map(j => `
                    <div style="background: var(--color-bg-surface); padding: 12px; border-radius: 6px;">
                      <div class="d-flex justify-between items-center mb-1">
                        <strong style="font-size: var(--fs-sm);">${escapeHtml(j.title)}</strong>
                        ${j.mood ? `<span style="font-size: 12px;">${j.mood}</span>` : ''}
                      </div>
                      <p class="text-body-sm text-secondary mb-0" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${escapeHtml(j.content)}
                      </p>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderIcons();
  bindCalendarEvents(container, habits, journals, habitLogs);
}

function bindCalendarEvents(container, habits, journals, habitLogs) {
  // Navigation buttons
  const prevBtn = $('#cal-prev-month-btn', container);
  const nextBtn = $('#cal-next-month-btn', container);
  const todayBtn = $('#cal-today-btn', container);

  if (prevBtn) {
    on(prevBtn, 'click', () => {
      viewDate.setMonth(viewDate.getMonth() - 1);
      renderCalendarView(container, habits, journals, habitLogs);
    });
  }

  if (nextBtn) {
    on(nextBtn, 'click', () => {
      viewDate.setMonth(viewDate.getMonth() + 1);
      renderCalendarView(container, habits, journals, habitLogs);
    });
  }

  if (todayBtn) {
    on(todayBtn, 'click', () => {
      viewDate = new Date();
      selectedDateStr = new Date().toISOString().split('T')[0];
      renderCalendarView(container, habits, journals, habitLogs);
    });
  }

  // Click on date cell
  $$('.cal-day-cell', container).forEach(cell => {
    on(cell, 'click', () => {
      const dateStr = cell.getAttribute('data-date');
      if (dateStr) {
        selectedDateStr = dateStr;
        renderCalendarView(container, habits, journals, habitLogs);
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
