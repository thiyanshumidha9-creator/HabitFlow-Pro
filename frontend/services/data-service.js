/* HabitFlow Pro — browser downloads and validated backup restore. */
import { api } from './api.js';
import { authService } from './auth-service.js';
import { settingsService, PROFILE_PICTURE_KEY } from './settings-service.js';

const BACKUP_FORMAT = 'habitflow-pro-backup';
const BACKUP_VERSION = 1;

function download(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stamp() { return new Date().toISOString().slice(0, 10); }
function csv(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

export async function collectBackup() {
  const { data } = await api.get('/data/backup');
  return {
    ...data,
    exported_at: new Date().toISOString(),
    profile_picture: localStorage.getItem(PROFILE_PICTURE_KEY),
    settings: settingsService.export(),
  };
}

export async function exportJson() {
  download(JSON.stringify(await collectBackup(), null, 2), 'application/json', `habitflow-backup-${stamp()}.json`);
}

export async function exportJournalTxt() {
  const { data = [] } = await api.getCached('/journals', 0);
  const text = data.map(item => `${item.entry_date} — ${item.title}\nMood: ${item.mood || 'Not set'}\nTags: ${item.tags || 'None'}\n\n${item.content}`).join('\n\n------------------------------\n\n');
  download(text || 'No journal entries.', 'text/plain;charset=utf-8', `habitflow-journal-${stamp()}.txt`);
}

export async function exportHabitCsv() {
  const { data = [] } = await api.getCached('/habits', 0);
  const rows = [['Name','Category','Frequency','Start Date','Streak','Completions','Completion %']];
  data.forEach(item => rows.push([item.name,item.category,item.frequency,item.start_date,item.streak,item.completions_count ?? '',item.completion_percentage]));
  download(rows.map(row => row.map(csv).join(',')).join('\r\n'), 'text/csv;charset=utf-8', `habitflow-habits-${stamp()}.csv`);
}

export function validateBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The selected file is not a valid backup.');
  if (value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) throw new Error('Unsupported HabitFlow backup format or version.');
  if (!Array.isArray(value.habits) || !Array.isArray(value.journal_entries)) throw new Error('Backup data is incomplete or corrupted.');
  for (const habit of value.habits) {
    if (!habit || typeof habit.name !== 'string' || !habit.name.trim() || !habit.start_date) throw new Error('Backup contains an invalid habit.');
  }
  for (const entry of value.journal_entries) {
    if (!entry || typeof entry.title !== 'string' || typeof entry.content !== 'string' || !entry.entry_date) throw new Error('Backup contains an invalid journal entry.');
  }
  if (value.settings != null && (typeof value.settings !== 'object' || Array.isArray(value.settings))) throw new Error('Backup contains invalid settings.');
  return value;
}

export async function importBackupFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.json')) throw new Error('Select a JSON backup file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Backup file is too large (10 MB maximum).');
  let backup;
  try { backup = JSON.parse(await file.text()); } catch { throw new Error('The backup file is not valid JSON.'); }
  validateBackup(backup);
  await api.post('/data/restore', backup);
  if (backup.settings) settingsService.restore(backup.settings);
  if (typeof backup.profile_picture === 'string') localStorage.setItem(PROFILE_PICTURE_KEY, backup.profile_picture);
  else localStorage.removeItem(PROFILE_PICTURE_KEY);
  await authService.refreshProfile();
  api.clearCache();
  return backup;
}
