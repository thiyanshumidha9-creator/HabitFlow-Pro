/* HabitFlow Pro — Profile Page Redesign */
import { authService } from '../services/auth-service.js';
import { api } from '../services/api.js';
import { PROFILE_PICTURE_KEY } from '../services/settings-service.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';
import { formatDateTime } from '../utils/time.js';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const formatDate = value => value ? new Date(value).toLocaleDateString(undefined,{dateStyle:'long'}) : 'Not available';
const initials = name => String(name || 'Member').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();

let stats = null;
let pendingPicture = null;

// Local events tracking key
const PROFILE_EVENTS_KEY = 'habitflow_profile_events';

function getLocalEvents() {
  try { return JSON.parse(localStorage.getItem(PROFILE_EVENTS_KEY) || '[]'); }
  catch { return []; }
}

export function logProfileEvent(type, message) {
  const events = getLocalEvents();
  events.push({
    type,
    message,
    timestamp: new Date().toISOString()
  });
  // Keep only latest 10 events
  if (events.length > 10) events.shift();
  localStorage.setItem(PROFILE_EVENTS_KEY, JSON.stringify(events));
}

function infoRow(icon, label, value, extraClass='', isUserId=false) {
  if (isUserId) {
    const truncated = value && value.length > 8 ? value.slice(0, 8) + '...' : value;
    return `
      <div class="profile-info-row">
        <span class="profile-info-icon" aria-hidden="true"><i data-lucide="${icon}"></i></span>
        <span class="profile-info-label">${label}</span>
        <strong class="profile-info-value ${extraClass}" style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="font-family: monospace; font-size: var(--fs-xs);">${esc(truncated)}</span>
          <button class="btn btn--ghost btn--icon btn--xs copy-uid-btn" data-uid="${esc(value)}" title="Copy User ID" type="button" style="padding: 2px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; min-height: 20px; width: 20px;">
            <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
          </button>
        </strong>
      </div>
    `;
  }
  return `<div class="profile-info-row"><span class="profile-info-icon" aria-hidden="true"><i data-lucide="${icon}"></i></span><span class="profile-info-label">${label}</span><strong class="profile-info-value ${extraClass}">${esc(value)}</strong></div>`;
}

function statCardEnhanced(icon, label, value, colorClass) {
  const colorMap = {
    blue: { bg: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)' },
    green: { bg: 'rgba(34,197,94,0.12)', color: 'var(--color-success)' },
    orange: { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-warning)' },
    purple: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }
  };
  const theme = colorMap[colorClass] || colorMap.blue;
  return `
    <article class="card stat-card-enhanced">
      <div class="card-body p-4 d-flex flex-col justify-between" style="height: 100%;">
        <div class="stat-card-header">
          <span class="stat-card-title">${label}</span>
          <div class="stat-card-icon-wrap" style="background: ${theme.bg}; color: ${theme.color};">
            <i data-lucide="${icon}"></i>
          </div>
        </div>
        <div class="stat-card-value">${esc(value)}</div>
      </div>
    </article>
  `;
}

function avatarContent(user, picture) {
  return picture ? `<img src="${picture}" alt="${esc(user.full_name)} profile picture">` : `<span aria-hidden="true">${esc(initials(user.full_name))}</span><span class="sr-only">${esc(user.full_name)} initials</span>`;
}

export async function render(container) {
  const user = authService.currentUser;
  if (!user) { container.innerHTML='<div class="page-enter text-center py-12"><h2>Not Authenticated</h2><a href="#/login" class="btn btn--primary">Log In</a></div>';return; }
  
  let habits = [];
  let journals = [];
  let habitLogs = [];

  try {
    const [statsRes, habitsRes, journalsRes, logsRes] = await Promise.all([
      api.getCached('/profile/stats', 10000).catch(() => ({ data: null })),
      api.getCached('/habits').catch(() => ({ data: [] })),
      api.getCached('/journals').catch(() => ({ data: [] })),
      api.getCached('/habits/logs').catch(() => ({ data: [] }))
    ]);
    stats = statsRes?.data || { total_habits: '—', completed_habits: '—', total_journal_entries: '—', achievements: [] };
    habits = habitsRes?.data || [];
    journals = journalsRes?.data || [];
    habitLogs = logsRes?.data || [];
  } catch (err) {
    console.error('[Profile render] Error fetching profile data:', err);
    stats = { total_habits: '—', completed_habits: '—', total_journal_entries: '—', achievements: [] };
  }

  const savedPicture = localStorage.getItem(PROFILE_PICTURE_KEY);
  const picture = pendingPicture ?? savedPicture;
  const hasPendingPicture = pendingPicture !== null;
  const earned = stats.achievements_earned ?? (stats.achievements||[]).filter(a=>a.unlocked).length;

  // 1. Calculate Profile Completion
  let compScore = 0;
  const compItems = [];
  
  if (user.full_name && user.full_name.length > 0) {
    compScore += 20;
    compItems.push({ label: 'Full Name set', done: true });
  } else {
    compItems.push({ label: 'Set your Full Name', done: false, action: 'edit-name' });
  }

  if (savedPicture) {
    compScore += 20;
    compItems.push({ label: 'Profile Photo uploaded', done: true });
  } else {
    compItems.push({ label: 'Upload a Profile Photo', done: false, action: 'edit-photo' });
  }

  if (user.phone && user.phone.length > 0) {
    compScore += 20;
    compItems.push({ label: 'Phone Number added', done: true });
  } else {
    compItems.push({ label: 'Add a Phone Number', done: false, action: 'edit-phone' });
  }

  const totalHabitsNum = parseInt(stats.total_habits) || habits.length || 0;
  if (totalHabitsNum > 0) {
    compScore += 20;
    compItems.push({ label: 'First Habit created', done: true });
  } else {
    compItems.push({ label: 'Create your first Habit', done: false, link: '#/habits' });
  }

  const totalJournalsNum = parseInt(stats.total_journal_entries) || journals.length || 0;
  if (totalJournalsNum > 0) {
    compScore += 20;
    compItems.push({ label: 'First Journal Entry written', done: true });
  } else {
    compItems.push({ label: 'Write your first Journal Entry', done: false, link: '#/journal' });
  }

  const barColor = compScore < 40 ? 'var(--color-danger)' : compScore < 80 ? 'var(--color-warning)' : 'var(--color-success)';

  // 2. Compile Recent Activity Timeline
  const timeline = [];
  
  // A. Habit completions
  habitLogs.slice(0, 5).forEach(log => {
    const habitObj = habits.find(h => h.id === log.habit_id);
    const hName = habitObj ? habitObj.name : 'Habit';
    timeline.push({
      type: 'habit',
      title: `Completed habit "${hName}"`,
      date: new Date(log.completed_date + 'T12:00:00')
    });
  });

  // B. Journals created
  journals.slice(0, 5).forEach(j => {
    const dateStr = j.entry_date ? j.entry_date + 'T12:00:00' : (j.created_at || Date.now());
    timeline.push({
      type: 'journal',
      title: `Created journal entry "${j.title}"`,
      date: new Date(dateStr)
    });
  });

  // C. Achievements unlocked
  (stats.achievements || []).filter(a => a.unlocked && a.unlock_date).forEach(a => {
    timeline.push({
      type: 'achievement',
      title: `Unlocked milestone "${a.title}"`,
      date: new Date(a.unlock_date + 'T12:00:00')
    });
  });

  // D. Local settings updates
  getLocalEvents().forEach(ev => {
    timeline.push({
      type: ev.type,
      title: ev.message,
      date: new Date(ev.timestamp)
    });
  });

  // Sort descending
  timeline.sort((a, b) => b.date - a.date);
  const activeTimeline = timeline.slice(0, 5);

  container.innerHTML=`
    <div class="page-enter sprint6-page">
      <header class="page-header mb-6">
        <h1 class="page-title">Profile</h1>
        <p class="page-subtitle">Manage your personal details and review your HabitFlow progress.</p>
      </header>
      
      <div class="profile-grid">
        <!-- LEFT PANEL: Identity Card & Completion Progress -->
        <div class="d-flex flex-col gap-6">
          <section class="card profile-account-card">
            <div class="card-header">
              <div>
                <h2 class="card-header-title">Account Information</h2>
                <p class="card-header-subtitle">Your profile and membership details</p>
              </div>
            </div>
            <div class="card-body">
              <div class="profile-identity">
                <div class="profile-avatar-wrap">
                  <div class="profile-avatar" id="profile-avatar">${avatarContent(user,picture)}</div>
                  <button class="profile-photo-button" id="avatar-button" type="button" aria-label="Edit profile photo">
                    <i data-lucide="camera"></i>
                    <span>Edit Photo</span>
                  </button>
                  <input id="avatar-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden>
                </div>
                <div class="profile-identity-copy">
                  <h3 class="profile-name">${esc(user.full_name)}</h3>
                  <span class="member-badge"><i data-lucide="user-round-check"></i>Member</span>
                </div>
              </div>
              
              <div class="profile-photo-actions ${picture?'':'is-hidden'}" id="photo-actions">
                <button class="btn btn--primary btn--sm ${hasPendingPicture?'':'is-hidden'}" id="save-avatar" type="button"><i data-lucide="save"></i>Save Photo</button>
                <button class="btn btn--secondary btn--sm" id="remove-avatar" type="button"><i data-lucide="trash-2"></i>Remove Photo</button>
              </div>
              <p class="form-helper profile-photo-helper text-center mb-4">JPG, JPEG, PNG, or WebP. Maximum 5 MB.</p>
              
              <div class="profile-info-list">
                ${infoRow('mail','Email',user.email)}
                ${infoRow('phone','Phone',user.phone || 'Not available')}
                ${infoRow('calendar-days','Member Since',formatDate(user.created_at))}
                ${infoRow('clock-3','Last Login',formatDateTime(user.last_login_at))}
                ${infoRow('shield-check','Account Status',user.is_active?'Active':'Inactive',user.is_active?'text-success':'text-danger')}
                ${infoRow('badge-check','Role',user.role?.toLowerCase()==='user'?'Member':user.role||'Member')}
                ${infoRow('fingerprint','User ID',user.id||'Not available', '', true)}
              </div>
              
              <div class="profile-actions">
                <button class="btn btn--primary btn--sm" id="edit-profile-button"><i data-lucide="pencil"></i>Edit Profile</button>
                <a class="btn btn--secondary btn--sm" href="#/settings"><i data-lucide="settings-2"></i>Manage Settings</a>
              </div>
              
              <div class="profile-editor" id="profile-editor" hidden>
                <hr>
                <form id="profile-form" class="profile-form">
                  <label class="form-group">
                    <span class="form-label">Full Name</span>
                    <input class="form-input" id="profile-name" value="${esc(user.full_name)}" minlength="2" maxlength="150" autocomplete="name" required>
                    <span class="form-helper">Enter between 2 and 150 characters.</span>
                  </label>
                  <label class="form-group">
                    <span class="form-label">Email Address</span>
                    <input class="form-input" id="profile-email" type="email" value="${esc(user.email)}" maxlength="255" autocomplete="email" required>
                  </label>
                  <label class="form-group">
                    <span class="form-label">Phone Number</span>
                    <input class="form-input" id="profile-phone" type="tel" value="${esc(user.phone || '')}" placeholder="+1 (555) 000-0000" maxlength="30">
                  </label>
                  <div class="profile-form-actions">
                    <button class="btn btn--primary btn--sm" type="submit"><i data-lucide="save"></i>Save Changes</button>
                    <button class="btn btn--secondary btn--sm" type="button" id="cancel-profile">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <!-- Profile Completion Card -->
          <section class="card">
            <div class="card-header">
              <div>
                <h2 class="card-header-title">Profile Completion</h2>
                <p class="card-header-subtitle">Build a complete workspace profile</p>
              </div>
            </div>
            <div class="card-body">
              <div class="completion-progress-container">
                <div class="completion-progress-header">
                  <span style="font-weight: 600; font-size: var(--fs-md);">${compScore}% Complete</span>
                  <span class="text-caption text-tertiary" style="font-size: var(--fs-xs);">${compScore === 100 ? 'Excellent! 🎉' : 'Keep going!'}</span>
                </div>
                <div class="completion-progress-bar">
                  <div class="completion-progress-fill" style="width: ${compScore}%; background-color: ${barColor};"></div>
                </div>
              </div>
              
              <ul class="completion-checklist">
                ${compItems.map(item => `
                  <li class="completion-item ${item.done ? 'completed' : ''}">
                    <i data-lucide="${item.done ? 'check-circle-2' : 'circle-dashed'}" style="color: ${item.done ? 'var(--color-success)' : 'var(--text-tertiary)'};"></i>
                    <span>${item.label}</span>
                    ${!item.done && item.action ? `
                      <span class="action-link" data-action="${item.action}">Complete</span>
                    ` : ''}
                    ${!item.done && item.link ? `
                      <a class="action-link" href="${item.link}">Go</a>
                    ` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          </section>
        </div>

        <!-- RIGHT PANEL: Stats, Password, Achievements, Recent Activity -->
        <div class="profile-main-column">
          <!-- Statistics Cards Grid -->
          <section aria-labelledby="quick-statistics-title">
            <div class="section-heading mb-4">
              <h2 id="quick-statistics-title" class="card-header-title mb-0">Quick Statistics</h2>
              <p class="card-header-subtitle">Your progress at a glance</p>
            </div>
            
            <div class="stats-grid-enhanced">
              ${statCardEnhanced('target','Total Habits', stats.total_habits ?? '0', 'blue')}
              ${statCardEnhanced('circle-check-big','Completed Habits', stats.completed_habits ?? stats.total_completions ?? '0', 'green')}
              ${statCardEnhanced('flame','Current Streak', stats.current_streak != null ? `${stats.current_streak} days` : '0 days', 'orange')}
              ${statCardEnhanced('book-open','Journal Entries', stats.total_journal_entries ?? '0', 'purple')}
            </div>
          </section>

          <!-- Change Password Card -->
          <section class="card">
            <div class="card-header">
              <div>
                <h2 class="card-header-title">Change Password</h2>
                <p class="card-header-subtitle">Protect your account with a strong, unique password</p>
              </div>
            </div>
            <div class="card-body">
              <form id="password-form" class="profile-form">
                <label class="form-group">
                  <span class="form-label">Current Password</span>
                  <div class="password-input-wrap">
                    <input class="form-input" id="current-password" type="password" autocomplete="current-password" required style="width: 100%; padding-right: 40px;">
                    <button type="button" class="btn btn--ghost btn--icon btn--sm toggle-password-btn" data-target="current-password" aria-label="Toggle password visibility">
                      <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    </button>
                  </div>
                </label>
                
                <label class="form-group">
                  <span class="form-label">New Password</span>
                  <div class="password-input-wrap">
                    <input class="form-input" id="new-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-requirements" required style="width: 100%; padding-right: 40px;">
                    <button type="button" class="btn btn--ghost btn--icon btn--sm toggle-password-btn" data-target="new-password" aria-label="Toggle password visibility">
                      <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    </button>
                  </div>
                  
                  <!-- Password Strength Meter -->
                  <div class="password-strength-container">
                    <div class="password-strength-label-row">
                      <span id="password-strength-label" style="color: var(--text-tertiary);">Strength: Too short</span>
                    </div>
                    <div class="password-strength-track">
                      <div class="password-strength-bar" id="password-strength-bar"></div>
                    </div>
                  </div>

                  <!-- Criteria Checklist -->
                  <ul class="password-validation-criteria">
                    <li class="criteria-item" id="criterion-length">
                      <i data-lucide="circle-dashed"></i> 8+ characters
                    </li>
                    <li class="criteria-item" id="criterion-letter">
                      <i data-lucide="circle-dashed"></i> Contains a letter (a-z, A-Z)
                    </li>
                    <li class="criteria-item" id="criterion-number">
                      <i data-lucide="circle-dashed"></i> Contains a number (0-9)
                    </li>
                    <li class="criteria-item" id="criterion-special">
                      <i data-lucide="circle-dashed"></i> Contains a special character (!@#$...)
                    </li>
                  </ul>
                </label>

                <label class="form-group">
                  <span class="form-label">Confirm Password</span>
                  <div class="password-input-wrap">
                    <input class="form-input" id="confirm-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required style="width: 100%; padding-right: 40px;">
                    <button type="button" class="btn btn--ghost btn--icon btn--sm toggle-password-btn" data-target="confirm-password" aria-label="Toggle password visibility">
                      <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                    </button>
                  </div>
                  <span class="form-helper" id="password-match-indicator" style="display: none; margin-top: 4px; font-weight: 500; font-size: var(--fs-xs);"></span>
                </label>

                <button class="btn btn--primary btn--sm d-flex items-center gap-2 justify-center" type="submit" id="update-password-btn" style="width: fit-content;">
                  <i data-lucide="key-round"></i>
                  <span>Update Password</span>
                </button>
              </form>
            </div>
          </section>

          <!-- Achievements Card -->
          <section class="card">
            <div class="card-header d-flex justify-between items-center flex-wrap gap-2">
              <div>
                <h2 class="card-header-title">Achievements</h2>
                <p class="card-header-subtitle">Milestones you have unlocked</p>
              </div>
              <a href="#/achievements" class="btn btn--outline btn--sm" style="display: inline-flex; align-items: center; gap: 4px;">
                <span>View All</span>
                <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
              </a>
            </div>
            <div class="card-body">
              <div class="achievement-list-enhanced">
                ${(stats.achievements||[]).filter(a=>a.unlocked).slice(0, 3).map(a => `
                  <div class="achievement-card-enhanced">
                    <div class="achievement-icon-wrap" style="color: var(--color-warning); background: rgba(245,158,11,0.12);">
                      <i data-lucide="${esc(a.icon || 'award')}"></i>
                    </div>
                    <div class="achievement-info">
                      <h4 class="achievement-card-title">${esc(a.title)}</h4>
                      <p class="achievement-card-desc">${esc(a.description || 'Milestone milestone unlocked')}</p>
                    </div>
                    <div class="achievement-card-meta">
                      <span class="badge badge--success" style="font-size: 10px;">Unlocked</span>
                      <span>${a.unlock_date || 'Recent'}</span>
                    </div>
                  </div>
                `).join('') || `
                  <p class="text-body-sm text-center py-4" style="color: var(--text-tertiary);">
                    No achievements unlocked yet. Keep building your routine.
                  </p>
                `}
              </div>
            </div>
          </section>

          <!-- Recent Activity Card -->
          <section class="card">
            <div class="card-header">
              <div>
                <h2 class="card-header-title">Recent Activity</h2>
                <p class="card-header-subtitle">Your latest actions in HabitFlow Pro</p>
              </div>
            </div>
            <div class="card-body">
              <div class="activity-timeline">
                ${activeTimeline.map(item => {
                  const typeColors = {
                    habit: 'habit',
                    journal: 'journal',
                    achievement: 'achievement',
                    profile: 'profile'
                  };
                  const dateStr = item.date.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  });
                  return `
                    <div class="activity-item ${typeColors[item.type] || 'journal'}">
                      <span class="activity-title">${esc(item.title)}</span>
                      <span class="activity-date">${dateStr}</span>
                    </div>
                  `;
                }).join('') || `
                  <p class="text-body-sm text-center py-4" style="color: var(--text-tertiary); margin: 0;">
                    No recent activity recorded yet.
                  </p>
                `}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  renderIcons();
  bind(container);
}

function bind(container){
  const editor = container.querySelector('#profile-editor');
  
  // Edit Profile / Cancel toggle
  container.querySelector('#edit-profile-button').onclick = () => {
    editor.hidden = false;
    container.querySelector('#profile-name').focus();
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  
  container.querySelector('#cancel-profile').onclick = () => {
    editor.hidden = true;
    container.querySelector('#edit-profile-button').focus();
  };

  // Clipboard copy user ID
  const copyBtn = container.querySelector('.copy-uid-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const uid = copyBtn.dataset.uid;
      if (uid) {
        navigator.clipboard.writeText(uid)
          .then(() => toastManager.success('User ID copied to clipboard!', 'Success'))
          .catch(() => toastManager.error('Failed to copy User ID.', 'Error'));
      }
    };
  }

  // Profile fields submission
  container.querySelector('#profile-form').onsubmit = async e => {
    e.preventDefault();
    const full_name = container.querySelector('#profile-name').value.trim();
    const email = container.querySelector('#profile-email').value.trim();
    const phone = container.querySelector('#profile-phone').value.trim();

    if (full_name.length < 2 || full_name.length > 150) {
      toastManager.error('Full name must be between 2 and 150 characters.', 'Profile');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toastManager.error('Enter a valid email address.', 'Profile');
      return;
    }

    try {
      await authService.updateProfile({ full_name, email, phone });
      logProfileEvent('profile', 'Updated profile information');
      toastManager.success('Profile updated successfully.', 'Profile Updated');
      render(container);
    } catch (err) {
      toastManager.error(err.message, 'Profile Update Failed');
    }
  };

  // Password submission & validation helper
  const newPwdInput = container.querySelector('#new-password');
  const strengthBar = container.querySelector('#password-strength-bar');
  const strengthLabel = container.querySelector('#password-strength-label');
  const confirmPwdInput = container.querySelector('#confirm-password');
  const matchIndicator = container.querySelector('#password-match-indicator');
  const updatePwdBtn = container.querySelector('#update-password-btn');

  function getPasswordStrength(pwd) {
    let score = 0;
    if (!pwd) return { score: 0, label: 'Too short', color: 'var(--text-tertiary)' };
    if (pwd.length >= 8) score++;
    if (/[A-Za-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const scoreMap = [
      { score: 0, label: 'Too weak', color: 'var(--color-danger)' },
      { score: 1, label: 'Weak', color: 'var(--color-danger)' },
      { score: 2, label: 'Medium', color: 'var(--color-warning)' },
      { score: 3, label: 'Strong', color: 'var(--color-warning)' },
      { score: 4, label: 'Excellent!', color: 'var(--color-success)' }
    ];
    return scoreMap[score];
  }

  function validateMatch() {
    if (!confirmPwdInput.value) {
      matchIndicator.style.display = 'none';
      return;
    }
    const matches = newPwdInput.value === confirmPwdInput.value;
    matchIndicator.style.display = 'block';
    matchIndicator.innerText = matches ? '✓ Passwords match' : '✗ Passwords do not match';
    matchIndicator.style.color = matches ? 'var(--color-success)' : 'var(--color-danger)';
  }

  function updateCriteria(pwd) {
    const check = (id, met) => {
      const el = container.querySelector(id);
      if (el) {
        el.className = `criteria-item ${met ? 'met' : ''}`;
        const icon = el.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', met ? 'check-circle' : 'circle-dashed');
        }
      }
    };
    check('#criterion-length', pwd.length >= 8);
    check('#criterion-letter', /[A-Za-z]/.test(pwd));
    check('#criterion-number', /\d/.test(pwd));
    check('#criterion-special', /[^A-Za-z0-9]/.test(pwd));
    renderIcons();
  }

  if (newPwdInput) {
    newPwdInput.oninput = () => {
      const val = newPwdInput.value;
      const res = getPasswordStrength(val);
      if (strengthBar) {
        strengthBar.style.width = `${(res.score / 4) * 100}%`;
        strengthBar.style.backgroundColor = res.color;
      }
      if (strengthLabel) {
        strengthLabel.innerText = `Strength: ${res.label}`;
        strengthLabel.style.color = res.color;
      }
      updateCriteria(val);
      validateMatch();
    };
  }

  if (confirmPwdInput) {
    confirmPwdInput.oninput = validateMatch;
  }

  // Password show/hide toggle buttons
  container.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.dataset.target;
      const targetInput = container.querySelector(`#${targetId}`);
      if (targetInput) {
        const isPwd = targetInput.type === 'password';
        targetInput.type = isPwd ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', isPwd ? 'eye-off' : 'eye');
          renderIcons();
        }
      }
    };
  });

  // Password submission
  container.querySelector('#password-form').onsubmit = async e => {
    e.preventDefault();
    const current = container.querySelector('#current-password').value;
    const next = newPwdInput.value;
    const confirm = confirmPwdInput.value;

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(next)) {
      toastManager.error('Password must be at least 8 characters with a letter and a number.', 'Password');
      return;
    }
    if (next !== confirm) {
      toastManager.error('New passwords do not match.', 'Password');
      return;
    }
    if (current === next) {
      toastManager.error('Your new password must be different from current password.', 'Password');
      return;
    }

    try {
      updatePwdBtn.disabled = true;
      const span = updatePwdBtn.querySelector('span');
      if (span) span.innerText = 'Updating...';
      
      await authService.changePassword(current, next);
      logProfileEvent('profile', 'Changed account password');
      e.target.reset();
      
      // Reset strength indicators
      if (strengthBar) strengthBar.style.width = '0%';
      if (strengthLabel) {
        strengthLabel.innerText = 'Strength: Too short';
        strengthLabel.style.color = 'var(--text-tertiary)';
      }
      updateCriteria('');
      if (matchIndicator) matchIndicator.style.display = 'none';

      toastManager.success('Password changed successfully.', 'Password Updated');
    } catch (err) {
      toastManager.error(err.message, 'Password Change Failed');
    } finally {
      updatePwdBtn.disabled = false;
      const span = updatePwdBtn.querySelector('span');
      if (span) span.innerText = 'Update Password';
    }
  };

  // Avatar Edit Upload & Delete Bindings
  const file = container.querySelector('#avatar-file');
  container.querySelector('#avatar-button').onclick = () => file.click();

  file.onchange = () => {
    const selected = file.files[0];
    if (!selected) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
      file.value = '';
      toastManager.error('Choose a JPG, JPEG, PNG, or WebP image up to 5 MB.', 'Invalid Photo');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingPicture = reader.result;
      container.querySelector('#profile-avatar').innerHTML = avatarContent(authService.currentUser, pendingPicture);
      container.querySelector('#photo-actions').classList.remove('is-hidden');
      container.querySelector('#save-avatar').classList.remove('is-hidden');
      toastManager.info('Preview ready. Select Save Photo to keep it.', 'Photo Preview');
    };
    reader.onerror = () => toastManager.error('Unable to read that image.', 'Upload Failed');
    reader.readAsDataURL(selected);
  };

  container.querySelector('#save-avatar').onclick = () => {
    if (!pendingPicture && localStorage.getItem(PROFILE_PICTURE_KEY)) return;
    const value = pendingPicture;
    if (value) localStorage.setItem(PROFILE_PICTURE_KEY, value);
    pendingPicture = null;
    window.dispatchEvent(new CustomEvent('profile:photochange', { detail: { picture: value } }));
    logProfileEvent('profile', 'Updated profile photo');
    toastManager.success('Profile photo saved.', 'Profile Updated');
    render(container);
  };

  container.querySelector('#remove-avatar').onclick = () => {
    localStorage.removeItem(PROFILE_PICTURE_KEY);
    pendingPicture = null;
    window.dispatchEvent(new CustomEvent('profile:photochange', { detail: { picture: null } }));
    logProfileEvent('profile', 'Removed profile photo');
    toastManager.success('Profile photo removed.', 'Photo Removed');
    render(container);
  };

  // Checklist Action Bindings
  container.querySelectorAll('.completion-item .action-link').forEach(link => {
    link.onclick = () => {
      const act = link.dataset.action;
      if (act === 'edit-name') {
        editor.hidden = false;
        container.querySelector('#profile-name').focus();
        editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (act === 'edit-photo') {
        file.click();
      } else if (act === 'edit-phone') {
        editor.hidden = false;
        container.querySelector('#profile-phone').focus();
        editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
  });
}
