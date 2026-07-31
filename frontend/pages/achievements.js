/* HabitFlow Pro — Sprint 5 Achievements */
import { api } from '../services/api.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export async function render(container) {
  container.innerHTML = `<div class="page-loader"><div class="spinner spinner--lg"></div><div class="page-loader-text">Loading achievements...</div></div>`;
  try {
    const { data } = await api.getCached('/analytics/achievements');
    const next = data.next_achievement;
    container.innerHTML = `<div class="page-enter"><div class="mb-6"><h1 class="page-title">Achievements</h1><p class="page-subtitle">Celebrate milestones and track what comes next (${data.unlocked_count}/${data.total_count} unlocked).</p></div>
      ${next?`<section class="card card--elevated mb-6"><div class="card-body"><div class="d-flex items-center justify-between gap-3 mb-3"><div><div class="text-caption text-tertiary">NEXT ACHIEVEMENT</div><h2 class="heading-3 mb-0">${escapeHtml(next.title)}</h2></div><strong>${next.progress_percentage}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${next.progress_percentage}%"></div></div><p class="text-body-sm text-secondary mt-2 mb-0">${next.progress} of ${next.threshold} — ${escapeHtml(next.description)}</p></div></section>`:''}
      <div class="achievement-grid">${data.achievements.map(a=>`<article class="achievement-item ${a.unlocked?'':'locked'}"><div class="achievement-badge ${a.unlocked?'unlocked':'locked'}"><i data-lucide="${a.unlocked?a.icon:'lock'}"></i></div><h2 class="achievement-title">${escapeHtml(a.title)}</h2><p class="achievement-desc">${escapeHtml(a.description)}</p><div class="progress-track"><div class="progress-fill ${a.unlocked?'complete':''}" style="width:${a.progress_percentage}%"></div></div><div class="achievement-progress-text">${a.progress} / ${a.threshold}</div><span class="badge ${a.unlocked?'badge--success':'badge--secondary'}">${a.unlocked?`Unlocked ${a.unlock_date}`:'Locked'}</span></article>`).join('')}</div></div>`;
    renderIcons();
  } catch (error) {
    toastManager.error(error.message || 'Unable to load achievements.', 'Achievements Error');
    container.innerHTML = `<div class="empty-state"><h3 class="empty-state-title">Achievements unavailable</h3><button class="btn btn--primary btn--sm" id="achievements-retry">Retry</button></div>`;
    container.querySelector('#achievements-retry')?.addEventListener('click',()=>render(container));
  }
}
