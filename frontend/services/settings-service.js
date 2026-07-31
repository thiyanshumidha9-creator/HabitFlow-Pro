/* HabitFlow Pro — persisted Sprint 6 preferences. */
import { themeManager } from '../utils/theme.js';

export const SETTINGS_KEY = 'habitflow_settings';
export const PROFILE_PICTURE_KEY = 'habitflow_profile_picture';

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  firstDayOfWeek: 'monday',
  timeFormat: '12',
  defaultHabitView: 'cards',
  language: 'en',
  rememberLogin: false,
  lockApp: false,
  notifications: {
    habitReminders: false,
    journalReminder: false,
    achievements: true,
    weeklySummary: false,
    monthlySummary: false,
  },
});

function mergeSettings(value = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(value.notifications || {}) },
  };
}

class SettingsService {
  get() {
    try { return mergeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
    catch { return mergeSettings(); }
  }

  save(patch) {
    const next = mergeSettings({ ...this.get(), ...patch });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    if (patch.theme) themeManager.set(patch.theme);
    window.dispatchEvent(new CustomEvent('settings:changed', { detail: next }));
    return next;
  }

  setNotification(name, enabled) {
    const current = this.get();
    return this.save({ notifications: { ...current.notifications, [name]: enabled } });
  }

  export() { return this.get(); }

  restore(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Backup settings are invalid.');
    const next = mergeSettings(value);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    themeManager.set(next.theme);
    return next;
  }
}

export const settingsService = new SettingsService();
