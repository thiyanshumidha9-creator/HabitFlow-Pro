/* HabitFlow Pro — Sprint 5 Analytics Dashboard */
import { api } from '../services/api.js';
import { toastManager } from '../components/toast.js';
import { renderIcons } from '../utils/icons.js';

let charts = [];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export async function render(container) {
  charts.forEach(chart => chart.destroy()); charts = [];
  container.innerHTML = `<div class="page-loader"><div class="spinner spinner--lg"></div><div class="page-loader-text">Loading analytics...</div></div>`;
  try {
    const { data } = await api.getCached('/analytics/overview');
    renderContent(container, data);
  } catch (error) {
    toastManager.error(error.message || 'Unable to load analytics.', 'Analytics Error');
    container.innerHTML = `<div class="empty-state"><i data-lucide="circle-alert"></i><h3 class="empty-state-title">Analytics unavailable</h3><p class="empty-state-description">Your existing data is safe. Please try again.</p><button class="btn btn--primary btn--sm" id="analytics-retry">Retry</button></div>`;
    container.querySelector('#analytics-retry')?.addEventListener('click', () => render(container)); renderIcons();
  }
}

function renderContent(container, data) {
  const s = data.summary;
  const stats = [
    ['target','Total Habits',s.total_habits], ['activity','Active Habits',s.active_habits], ['circle-check','Completed Today',s.completed_today],
    ['calendar-days','Weekly Completion',`${s.weekly_completion_pct}%`], ['calendar-range','Monthly Completion',`${s.monthly_completion_pct}%`],
    ['flame','Current Streak',`${s.current_streak} days`], ['trophy','Longest Streak',`${s.longest_streak} days`], ['gauge','Productivity Score',s.productivity_score],
    ['book-open','Journal Entries',s.total_journal_entries], ['pen-line','Journal Consistency',`${s.journal_consistency_pct}%`]
  ];
  const insightLabels = {most_productive_weekday:'Most Productive Weekday',most_completed_habit:'Most Completed Habit',least_completed_habit:'Least Completed Habit',average_completion_rate:'Average Completion Rate',weekly_consistency:'Weekly Consistency',monthly_consistency:'Monthly Consistency',journal_writing_frequency:'Journal Entries / Day',best_streak:'Best Streak',longest_inactive_period:'Longest Inactive Period'};
  container.innerHTML = `<div class="page-enter">
    <div class="mb-6"><h1 class="page-title">Analytics & Insights</h1><p class="page-subtitle">Real-time intelligence from your habits and journal activity.</p></div>
    <section class="analytics-section" aria-labelledby="overview-title"><h2 class="analytics-section-title" id="overview-title"><i data-lucide="layout-dashboard"></i>Overview</h2><div class="stats-grid">${stats.map(([icon,label,value])=>`<article class="stat-card"><div class="stat-card-icon" style="background:var(--color-primary-subtle);color:var(--color-primary)"><i data-lucide="${icon}"></i></div><div class="stat-card-value">${value}</div><div class="stat-card-label">${label}</div></article>`).join('')}</div></section>
    <section class="analytics-section" aria-labelledby="charts-title"><h2 class="analytics-section-title" id="charts-title"><i data-lucide="chart-no-axes-combined"></i>Performance Charts</h2><div class="chart-grid">
      ${chartCard('Weekly Habit Completion','weekly-chart')}${chartCard('Monthly Habit Progress','monthly-chart')}${chartCard('Habit Category Distribution','category-chart')}${chartCard('Journal Activity','journal-chart')}${chartCard('Streak Progress','streak-chart')}
    </div></section>
    <section class="analytics-section"><h2 class="analytics-section-title"><i data-lucide="lightbulb"></i>Productivity Insights</h2><div class="insights-grid">${Object.entries(data.insights).map(([key,value])=>`<article class="insight-item"><div class="insight-icon" style="background:var(--color-primary-subtle);color:var(--color-primary)"><i data-lucide="sparkles"></i></div><div class="insight-content"><div class="insight-label">${insightLabels[key]}</div><div class="insight-value">${escapeHtml(value)}${key.includes('consistency')||key==='average_completion_rate'?'%':''}${key.includes('streak')||key==='longest_inactive_period'?' days':''}</div></div></article>`).join('')}</div></section>
    <section class="analytics-section"><div class="d-flex items-center justify-between mb-4"><h2 class="analytics-section-title mb-0"><i data-lucide="award"></i>Achievement Progress</h2><a href="#/achievements" class="btn btn--outline btn--sm">View All</a></div><div class="achievement-grid">${data.achievements.slice(0,4).map(achievementCard).join('')}</div></section>
  </div>`;
  renderIcons(); requestAnimationFrame(() => drawCharts(data));
}
function chartCard(title,id){return `<article class="chart-container"><h3 class="chart-container-title">${title}</h3><div class="chart-canvas-wrapper"><canvas id="${id}" role="img" aria-label="${title}"></canvas></div></article>`}
function achievementCard(a){return `<article class="achievement-item ${a.unlocked?'':'locked'}"><div class="achievement-badge ${a.unlocked?'unlocked':'locked'}"><i data-lucide="${a.unlocked?a.icon:'lock'}"></i></div><h3 class="achievement-title">${escapeHtml(a.title)}</h3><p class="achievement-desc">${escapeHtml(a.description)}</p><div class="progress-track"><div class="progress-fill ${a.unlocked?'complete':''}" style="width:${a.progress_percentage}%"></div></div><div class="achievement-progress-text">${a.progress} / ${a.threshold}${a.unlock_date?` · ${a.unlock_date}`:''}</div></article>`}
function drawCharts(data){
  if (!window.Chart) { toastManager.error('Chart library failed to load.', 'Charts Error'); return; }
  const css=getComputedStyle(document.documentElement), primary=css.getPropertyValue('--color-primary').trim()||'#6366f1', success=css.getPropertyValue('--color-success').trim()||'#22c55e', text=css.getPropertyValue('--text-secondary').trim()||'#64748b', grid=css.getPropertyValue('--border-color').trim()||'#e2e8f0';
  Chart.defaults.color=text; const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:grid}},x:{grid:{display:false}}}};
  charts.push(new Chart(document.querySelector('#weekly-chart'),{type:'line',data:{labels:data.weekly.map(x=>x.day),datasets:[{data:data.weekly.map(x=>x.completions),borderColor:primary,backgroundColor:primary,tension:.35,fill:false}]},options:base}));
  charts.push(new Chart(document.querySelector('#monthly-chart'),{type:'line',data:{labels:data.monthly.map(x=>x.day),datasets:[{data:data.monthly.map(x=>x.percentage),borderColor:success,backgroundColor:success,tension:.3}]},options:{...base,scales:{...base.scales,y:{...base.scales.y,max:100}}}}));
  charts.push(new Chart(document.querySelector('#category-chart'),{type:'doughnut',data:{labels:data.categories.map(x=>x.category),datasets:[{data:data.categories.map(x=>x.count),backgroundColor:[primary,success,'#f59e0b','#ec4899','#06b6d4']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom'}}}}));
  charts.push(new Chart(document.querySelector('#journal-chart'),{type:'bar',data:{labels:data.journal_activity.map(x=>x.day),datasets:[{data:data.journal_activity.map(x=>x.entries),backgroundColor:primary,borderRadius:5}]},options:base}));
  charts.push(new Chart(document.querySelector('#streak-chart'),{type:'line',data:{labels:data.streak_progress.map(x=>x.date.slice(5)),datasets:[{data:data.streak_progress.map(x=>x.streak),borderColor:'#f59e0b',backgroundColor:'#f59e0b',tension:.25}]},options:base}));
}
