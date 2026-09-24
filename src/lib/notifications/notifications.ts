/** Hash route for the notification list. Page routes stay capitalised, like #/FAQ and #/Reports. */
export const notificationsRoute = '#/Notifications';

export function isNotificationsHash(hash: string): boolean {
  return hash === notificationsRoute;
}

export type NotificationStatus = 'under-review' | 'approved' | 'completed';

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  'under-review': 'Under review',
  approved: 'Approved',
  completed: 'Completed',
};

export interface ReportStatusNotification {
  readonly id: string;
  readonly reportName: string;
  /** Short report reference shown after the name, without the leading #. */
  readonly reportReference: string;
  readonly status: NotificationStatus;
  readonly receivedAt: Date;
  readonly read: boolean;
}

const hourMs = 3_600_000;
const dayMs = 24 * hourMs;
const sampleTime = Date.now();
const receivedAgo = (days: number, hours: number) => new Date(sampleTime - days * dayMs - hours * hourMs);

/** Session-only sample content from the notification mockup, newest first. */
export const sampleNotifications: readonly ReportStatusNotification[] = [
  { id: 'n-8890-review', reportName: 'lalalallalal', reportReference: '8890', status: 'under-review', receivedAt: receivedAgo(7, 1), read: false },
  { id: 'n-8890-approved', reportName: 'lalalallalal', reportReference: '8890', status: 'approved', receivedAt: receivedAgo(7, 3), read: true },
  { id: 'n-0a3b-approved', reportName: 'GGeZ', reportReference: '0A3B', status: 'approved', receivedAt: receivedAgo(9, 1), read: true },
  { id: 'n-39fe-review', reportName: 'Test35', reportReference: '39FE', status: 'under-review', receivedAt: receivedAgo(9, 2), read: true },
  { id: 'n-39fe-completed', reportName: 'Test35', reportReference: '39FE', status: 'completed', receivedAt: receivedAgo(9, 3), read: true },
];

export function unreadCount(notifications: readonly ReportStatusNotification[]): number {
  return notifications.filter((notification) => !notification.read).length;
}

export function markAllRead(notifications: readonly ReportStatusNotification[]): ReportStatusNotification[] {
  return notifications.map((notification) => notification.read ? notification : { ...notification, read: true });
}

const relativeDays = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Whole days since the notification arrived: "today", "yesterday", "7 days ago". */
export function formatNotificationAge(receivedAt: Date, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - receivedAt.getTime()) / dayMs));
  return relativeDays.format(-days, 'day');
}
