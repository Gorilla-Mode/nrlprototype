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

export function geometryTypeFor(category: string): 'Line' | 'Point' {
  return category === 'Bridge' ? 'Line' : 'Point';
}

export type GeometryFilter = 'Point' | 'Line' | 'Area';
export type HeightFilter = 'any' | 'under30' | '30to60' | 'over60';

export function heightInMeters(value: string): number | null {
  const match = value.match(/\(([\d.]+)\s*m\)/);
  return match ? parseFloat(match[1]) : null;
}

export function matchesHeightFilter(value: string, filter: HeightFilter): boolean {
  if (filter === 'any') return true;
  const meters = heightInMeters(value);
  if (meters === null) return false;
  if (filter === 'under30') return meters < 30;
  if (filter === '30to60') return meters >= 30 && meters <= 60;
  return meters > 60;
}
