import { settingsService } from '../services/settings-service.js';

const TRANSLATIONS = {
  en: {
    // Settings Sections
    appearance: 'Appearance',
    notifications: 'Notifications',
    privacy: 'Privacy',
    data: 'Data',
    application: 'Application',
    
    // Settings Keys
    theme: 'Theme',
    firstDayOfWeek: 'First Day of Week',
    timeFormat: 'Time Format',
    defaultHabitView: 'Default Habit View',
    language: 'Language',
  },
  es: {
    // Settings Sections
    appearance: 'Apariencia',
    notifications: 'Notificaciones',
    privacy: 'Privacidad',
    data: 'Datos',
    application: 'Aplicación',
    
    // Settings Keys
    theme: 'Tema',
    firstDayOfWeek: 'Primer día de la semana',
    timeFormat: 'Formato de hora',
    defaultHabitView: 'Vista de hábitos predeterminada',
    language: 'Idioma',
  }
};

/**
 * Translate a key based on the selected language setting.
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  const settings = settingsService.get();
  const lang = settings.language || 'en';
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}
