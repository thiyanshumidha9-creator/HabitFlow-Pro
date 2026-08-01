import { settingsService } from './settings-service.js';

class NotificationService {
  constructor() {
    this._checkPermission();
  }

  _checkPermission() {
    this.supported = typeof window !== 'undefined' && 'Notification' in window;
    this.permission = this.supported ? Notification.permission : 'denied';
  }

  async requestPermission() {
    if (!this.supported) return 'unsupported';
    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  /**
   * Hook called when Habit Reminders preference is toggled.
   * Can be connected to Web Push subscription or local worker schedule in the future.
   * @param {boolean} enabled
   */
  async updateHabitReminders(enabled) {
    console.log(`[NotificationService] Habit reminders toggled: ${enabled}`);
  }

  /**
   * Hook called when Daily Journal Reminder preference is toggled.
   * @param {boolean} enabled
   */
  async updateJournalReminder(enabled) {
    console.log(`[NotificationService] Daily journal reminder toggled: ${enabled}`);
  }

  /**
   * Hook called when Weekly Summary preference is toggled.
   * @param {boolean} enabled
   */
  async updateWeeklySummary(enabled) {
    console.log(`[NotificationService] Weekly summary toggled: ${enabled}`);
  }

  /**
   * Hook called when Monthly Summary preference is toggled.
   * @param {boolean} enabled
   */
  async updateMonthlySummary(enabled) {
    console.log(`[NotificationService] Monthly summary toggled: ${enabled}`);
  }

  /**
   * Triggered when an achievement is unlocked.
   * Respects user's notification preferences.
   * @param {Object} achievement
   */
  async notifyAchievementUnlocked(achievement) {
    const settings = settingsService.get();
    if (!settings.notifications.achievements) {
      console.log(`[NotificationService] Achievement notification suppressed: ${achievement.title}`);
      return;
    }
    
    this._checkPermission();
    if (this.supported && this.permission === 'granted') {
      try {
        new Notification('Milestone Unlocked! 🏆', {
          body: `Congratulations! You've unlocked: ${achievement.title}`,
          icon: './icons/icon-192.png'
        });
      } catch (err) {
        console.warn('[NotificationService] Failed to trigger browser notification:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
