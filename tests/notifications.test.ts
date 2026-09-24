import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component, Snippet } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import {
  formatNotificationAge, isNotificationsHash, markAllRead, notificationsRoute, sampleNotifications, unreadCount,
  type ReportStatusNotification,
} from '../src/lib/notifications/notifications.js';
import { isReportsHash } from '../src/lib/reports/reports.js';
import { settingsSectionFromHash, type SettingsSection } from '../src/lib/settings/settings.js';

const pageUrl = await compileSvelteComponent('src/lib/notifications/NotificationsPage.svelte', {
  './notifications': new URL('../src/lib/notifications/notifications.js', import.meta.url).href,
});
const { default: NotificationsPage } = await import(pageUrl) as {
  default: Component<{ notifications: readonly ReportStatusNotification[]; onback: () => void; onmarkallread: () => void }>;
};
const menuUrl = await compileSvelteComponent('src/lib/map/MenuDrawer.svelte');
const { default: MenuDrawer } = await import(menuUrl) as {
  default: Component<{ onfaq: () => void; onnotifications: () => void; onsettings: (section: SettingsSection) => void; ondismiss: () => void; debugContent?: Snippet }>;
};
const noop = () => {};
const page = (notifications: readonly ReportStatusNotification[]) =>
  render(NotificationsPage, { props: { notifications, onback: noop, onmarkallread: noop } }).body;
const button = (html: string, text: string) =>
  html.split('<button').map((part) => part.split('</button>')[0]).find((part) => part.includes(text)) ?? '';
const markAllReadButton = (html: string) => button(html, 'Mark all read');

test('the Notifications route resolves only for its own hash and never collides with Settings or Reports', () => {
  assert.equal(notificationsRoute, '#/Notifications');
  assert.equal(isNotificationsHash(notificationsRoute), true);
  for (const hash of ['', '#/FAQ', '#/Reports', '#/Settings/notifications', '#/Notifications/1', '#/notifications']) {
    assert.equal(isNotificationsHash(hash), false);
  }
  assert.equal(settingsSectionFromHash(notificationsRoute), null);
  assert.equal(isReportsHash(notificationsRoute), false);
});

test('the menu Notifications row is available and no longer labelled as unavailable', () => {
  const html = render(MenuDrawer, { props: { onfaq: noop, onnotifications: noop, onsettings: noop, ondismiss: noop } }).body;
  const row = button(html, '>Notifications');
  assert.ok(row);
  assert.doesNotMatch(row, /disabled|Not available in this prototype/);
  assert.match(row, /menu-chevron/);
});

test('sample notifications follow the mockup: five updates, newest first, one unread', () => {
  assert.equal(sampleNotifications.length, 5);
  assert.equal(unreadCount(sampleNotifications), 1);
  assert.equal(sampleNotifications[0].read, false);
  const times = sampleNotifications.map((notification) => notification.receivedAt.getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
  const now = new Date();
  assert.equal(formatNotificationAge(sampleNotifications[0].receivedAt, now), '7 days ago');
  assert.equal(formatNotificationAge(sampleNotifications[4].receivedAt, now), '9 days ago');
});

test('Mark all read returns read copies without mutating the session list', () => {
  const read = markAllRead(sampleNotifications);
  assert.equal(unreadCount(read), 0);
  assert.equal(unreadCount(sampleNotifications), 1);
  assert.notEqual(read[0], sampleNotifications[0]);
  assert.equal(read[1], sampleNotifications[1]);
});

test('notification age counts whole elapsed days and never reports a future time', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  assert.equal(formatNotificationAge(new Date('2026-09-24T01:00:00Z'), now), 'today');
  assert.equal(formatNotificationAge(new Date('2026-09-23T11:00:00Z'), now), 'yesterday');
  assert.equal(formatNotificationAge(new Date('2026-09-17T11:59:00Z'), now), '7 days ago');
  assert.equal(formatNotificationAge(new Date('2026-09-25T12:00:00Z'), now), 'today');
});

test('page states each status change in text and identifies the unread card without relying on colour', () => {
  const html = page(sampleNotifications);
  assert.match(html, />1 unread</);
  assert.equal(html.match(/<li /g)?.length, 5);
  assert.equal(html.match(/<p class="sr-only">Unread<\/p>/g)?.length, 1);
  assert.equal(html.match(/notifications-unread-dot/g)?.length, 1);
  assert.ok(html.includes('Status of report "GGeZ" (#0A3B)'));
  for (const label of ['Under review', 'Approved', 'Completed']) assert.ok(html.includes(`<strong>${label}</strong>`));
  assert.match(html, /<time datetime="[^"]+">7 days ago<\/time>/);
  assert.doesNotMatch(markAllReadButton(html), /disabled/);
});

test('when everything is read the summary says so and Mark all read is unavailable', () => {
  const html = page(markAllRead(sampleNotifications));
  assert.match(html, />No unread notifications</);
  assert.match(markAllReadButton(html), /disabled/);
  assert.doesNotMatch(html, />Unread<|notifications-unread-dot|notifications-card-unread/);
});

test('an empty list shows an explicit empty state and report names render as text', () => {
  assert.match(page([]), />No notifications</);
  const html = page([{ ...sampleNotifications[0], reportName: '<img src=x>' }]);
  assert.ok(html.includes('&lt;img src=x>'));
  assert.ok(!html.includes('<img'));
});
