export type Draft = {
  id: string;
  title: string;
  category: string;
  value: string;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  editedDate: string;

  // detail-page fields
  createdDate: string;
  heightAboveGround: string;
  lighting: string;
  pilotReportText: string;
  reportedByName: string;
  reportedByOrg: string;
  coordinates: { lat: number; lng: number } | null;
  vertexCount: number;
};

const lineCategories = new Set(['Bridge', 'Aerial span']);

export function geometryTypeFor(category: string): 'Line' | 'Point' {
  return lineCategories.has(category) ? 'Line' : 'Point';
}

export function lightingSummary(lighting: string): string {
  if (lighting === 'Yes') return 'Lit — reported by pilot';
  if (lighting === 'No') return 'Not lit — reported by pilot';
  return 'Not set';
}

export function heightInMeters(value: string): number | null {
  const match = value.match(/\(([\d.]+)\s*m\)/);
  return match ? parseFloat(match[1]) : null;
}

export function formatHeightFromMeters(meters: number | null): string {
  if (meters === null || Number.isNaN(meters)) return 'Not set';
  const feet = Math.round(meters * 3.28084);
  return `${feet} ft (${meters} m)`;
}

export function formatToday(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${now.getFullYear()}`;
}
