export type SettingsSection = 'profile' | 'security' | 'notifications' | 'offline-maps' | 'location' | 'map-layers' | 'language';
export type LanguagePreference = 'nb' | 'en';

export const settingsSections: { id: SettingsSection; label: string; group: string; icon: string }[] = [
  { id: 'profile', label: 'My Profile', group: 'ACCOUNT', icon: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21v-2a8 8 0 0 1 16 0v2' },
  { id: 'security', label: 'Password & Security', group: 'ACCOUNT', icon: 'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4' },
  { id: 'notifications', label: 'Notification Preferences', group: 'NOTIFICATIONS', icon: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4' },
  { id: 'offline-maps', label: 'Offline Maps', group: 'MAP & DATA', icon: 'M4 17H3V5h18v12h-1M12 9v12m-4-4 4 4 4-4' },
  { id: 'location', label: 'Location & Accuracy', group: 'MAP & DATA', icon: 'M7 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 2v4m0 12v4M2 12h4m12 0h4' },
  { id: 'map-layers', label: 'Map Layers', group: 'MAP & DATA', icon: 'm3 7 9-5 9 5-9 5Zm0 5 9 5 9-5M3 17l9 5 9-5' },
  { id: 'language', label: 'Language', group: 'ACCESSIBILITY', icon: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18' },
];

export function settingsSectionFromHash(hash: string): SettingsSection | null {
  if (hash === '#/Settings') return 'profile';
  return settingsSections.find(section => hash === `#/Settings/${section.id}`)?.id ?? null;
}
