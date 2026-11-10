/** Lets any page tell the top bar that notifications changed (so the badge refreshes immediately). */
export const NOTIFICATIONS_CHANGED = 'fintrack:notifications-changed';
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
