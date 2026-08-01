/* HabitFlow Pro — Sprint 6 Settings Page */
import { createCard } from '../components/card.js';
import { renderIcons } from '../utils/icons.js';
import { themeManager } from '../utils/theme.js';
import { authService } from '../services/auth-service.js';
import { tokenService } from '../services/token-service.js';
import { settingsService } from '../services/settings-service.js';
import { offlineService } from '../services/offline-service.js';
import { exportJson, exportJournalTxt, exportHabitCsv, importBackupFile } from '../services/data-service.js';
import { toastManager } from '../components/toast.js';
import { t } from '../utils/i18n.js';
import { notificationService } from '../services/notification-service.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const option = (value, label, current) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`;
const toggle = (id, label, detail, checked) => `<label class="settings-row" for="${id}"><span><strong>${label}</strong><small>${detail}</small></span><input class="settings-toggle" type="checkbox" id="${id}" ${checked ? 'checked' : ''}></label>`;
const selectRow = (id, label, value, options) => `<label class="settings-row" for="${id}"><span><strong>${label}</strong></span><select class="form-input form-input--sm" id="${id}">${options.map(x=>option(x[0],x[1],value)).join('')}</select></label>`;
const sectionTitle = (icon, title) => `<span class="settings-section-heading"><span class="settings-section-icon"><i data-lucide="${icon}"></i></span><span>${title}</span></span>`;

export function render(container) {
  const user = authService.currentUser;
  if (!user) { container.innerHTML = '<div class="page-enter text-center py-12"><h2>Not Authenticated</h2><a href="#/login" class="btn btn--primary">Log In</a></div>'; return; }
  const settings = settingsService.get();
  const n = settings.notifications;
  container.innerHTML = `<div class="page-enter sprint6-page">
    <div class="mb-6"><h1 class="page-title">${t('settings')}</h1><p class="page-subtitle">Customize and manage your HabitFlow Pro workspace</p></div>
    <div class="settings-grid">
      ${createCard({className:'settings-card',title:sectionTitle('palette',t('appearance')),subtitle:'Theme and display preferences',body:`
        ${selectRow('setting-theme',t('theme'),settings.theme,[['light','Light Mode'],['dark','Dark Mode'],['system','System Theme']])}
        ${selectRow('setting-week',t('firstDayOfWeek'),settings.firstDayOfWeek,[['monday','Monday'],['sunday','Sunday']])}
        ${selectRow('setting-time',t('timeFormat'),settings.timeFormat,[['12','12 hour'],['24','24 hour']])}
        ${selectRow('setting-view',t('defaultHabitView'),settings.defaultHabitView,[['cards','Cards'],['list','List']])}
        ${selectRow('setting-language',t('language'),settings.language,[['en','English'],['es','Español']])}`})}
      ${createCard({className:'settings-card',title:sectionTitle('bell-ring',t('notifications')),subtitle:'Browser and reminder preferences',body:`
        <p id="notification-support" class="text-body-sm mb-3">${notificationStatus()}</p>
        ${toggle('notify-habits','Habit reminders','Reminder for active habits',n.habitReminders)}
        ${toggle('notify-journal','Daily journal reminder','A daily writing prompt',n.journalReminder)}
        ${toggle('notify-achievements','Achievement notifications','Celebrate newly unlocked milestones',n.achievements)}
        ${toggle('notify-weekly','Weekly summary','Weekly activity recap',n.weeklySummary)}
        ${toggle('notify-monthly','Monthly summary','Monthly progress recap',n.monthlySummary)}`})}
      ${createCard({className:'settings-card',title:sectionTitle('shield-check',t('privacy')),subtitle:'Session and local-device controls',body:`
        ${toggle('setting-remember','Remember Login','Keep this account signed in on this device',settings.rememberLogin)}
        ${toggle('setting-lock','Lock App','Require a quick unlock after returning to the app',settings.lockApp)}`})}
      ${createCard({className:'settings-card',title:sectionTitle('database','Data'),subtitle:'Download, import, and restore your information',body:`
        <div class="settings-actions"><button class="btn btn--primary btn--sm" id="export-json">Export JSON</button><button class="btn btn--secondary btn--sm" id="export-journal">Journal TXT</button><button class="btn btn--secondary btn--sm" id="export-habits">Habit CSV</button></div>
        <hr><p class="text-body-sm">Importing a valid backup replaces your current habits and journal entries after confirmation.</p>
        <input type="file" id="backup-file" accept="application/json,.json" hidden><button class="btn btn--secondary btn--sm" id="import-backup"><i data-lucide="upload"></i> Import & Restore</button>`})}
      ${createCard({className:'settings-card',title:sectionTitle('app-window','Application'),subtitle:'Local app maintenance and account access',body:`
        <p class="text-body-sm">Manage cached application files or securely end this session.</p>
        <div class="settings-actions"><button class="btn btn--secondary btn--sm" id="clear-cache"><i data-lucide="trash-2"></i> Clear Local Cache</button><button class="btn btn--danger btn--sm" id="settings-logout"><i data-lucide="log-out"></i> Sign Out</button></div>`})}
    </div></div>`;
  renderIcons(); bind(container);
}

function notificationStatus() {
  if (!('Notification' in window)) return 'Browser notifications are not supported here; preferences will still be saved.';
  return `Browser permission: ${escapeHtml(Notification.permission)}.`;
}

function bind(container) {
  const save = patch => { settingsService.save(patch); toastManager.success('Setting saved.', 'Settings'); };
  container.querySelector('#setting-theme').onchange = e => save({ theme:e.target.value });
  container.querySelector('#setting-week').onchange = e => save({ firstDayOfWeek:e.target.value });
  container.querySelector('#setting-time').onchange = e => save({ timeFormat:e.target.value });
  container.querySelector('#setting-view').onchange = e => save({ defaultHabitView:e.target.value });
  container.querySelector('#setting-language').onchange = e => { save({ language:e.target.value }); render(container); };
  container.querySelector('#setting-remember').onchange = e => { tokenService.setRememberMe(e.target.checked); save({ rememberLogin:e.target.checked }); };
  container.querySelector('#setting-lock').onchange = e => save({ lockApp:e.target.checked });
  const notificationMap = {'notify-habits':'habitReminders','notify-journal':'journalReminder','notify-achievements':'achievements','notify-weekly':'weeklySummary','notify-monthly':'monthlySummary'};
  Object.entries(notificationMap).forEach(([id,key]) => container.querySelector(`#${id}`).onchange = async e => {
    if (e.target.checked) {
      if (!('Notification' in window)) { e.target.checked=false; toastManager.error('This browser does not support notifications.', 'Notifications'); return; }
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { e.target.checked=false; toastManager.error('Notification permission was denied.', 'Notifications'); return; }
      }
    }
    settingsService.setNotification(key,e.target.checked);
    toastManager.success('Notification preference saved.', 'Notifications');
    
    // Connect clean hooks to the notification service
    if (key === 'habitReminders') {
      notificationService.updateHabitReminders(e.target.checked);
    } else if (key === 'journalReminder') {
      notificationService.updateJournalReminder(e.target.checked);
    } else if (key === 'weeklySummary') {
      notificationService.updateWeeklySummary(e.target.checked);
    } else if (key === 'monthlySummary') {
      notificationService.updateMonthlySummary(e.target.checked);
    }
  });
  container.querySelector('#clear-cache').onclick = async () => {
    offlineService.clearDataCache();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    toastManager.success('Cache cleared. Reloading application to apply updates...', 'Success');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
  container.querySelector('#settings-logout').onclick = async () => { await authService.logout(); location.hash='#/login'; };
  const runExport = async (fn,label) => { try { await fn(); toastManager.success(`${label} downloaded.`, 'Export Complete'); } catch(e) { toastManager.error(e.message,'Export Failed'); } };
  container.querySelector('#export-json').onclick=()=>runExport(exportJson,'JSON backup');
  container.querySelector('#export-journal').onclick=()=>runExport(exportJournalTxt,'Journal text');
  container.querySelector('#export-habits').onclick=()=>runExport(exportHabitCsv,'Habit summary');
  const file=container.querySelector('#backup-file'); container.querySelector('#import-backup').onclick=()=>file.click();
  file.onchange=async()=>{ if(!file.files[0])return; if(!confirm('Restore this backup? Current habits and journal entries will be replaced.')){file.value='';return;} try{await importBackupFile(file.files[0]);toastManager.success('Backup restored successfully.','Restore Complete');render(container);}catch(e){toastManager.error(e.message,'Invalid Import');}finally{file.value='';} };
}
