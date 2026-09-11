import type { Snippet } from 'svelte';

export interface RadialMenuItem {
  id: string;
  label: string;
  color: string;
  /** Icon contents, drawn in a 24 × 24 SVG viewport. */
  icon: Snippet;
}

export interface RadialMenuProps {
  items: readonly RadialMenuItem[];
  innerRadius?: number;
  outerRadius?: number;
  hoverExpansion?: number;
  /** Pointer offset from the menu center, supplied by the owning gesture. */
  pointer?: { x: number; y: number } | null;
  label?: string;
}

/** Each sector extends outward indefinitely; only the central safe zone clears hover. */
export function getHoveredRadialSegment(
  pointer: RadialMenuProps['pointer'],
  count: number,
  innerRadius: number,
): number | null {
  if (!pointer || count === 0) return null;
  const radius = Math.hypot(pointer.x, pointer.y);
  if (!Number.isFinite(radius) || radius <= innerRadius) return null;

  const turn = 2 * Math.PI;
  const step = turn / count;
  const angle = (Math.atan2(pointer.y, pointer.x) + Math.PI / 2 + step / 2 + turn) % turn;
  return Math.floor(angle / step);
}

/** Equal annular sectors, clockwise with the first item centered at twelve o'clock. */
export function createRadialSegments(count: number, innerRadius: number, outerRadius: number) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Item count must be a nonnegative integer.');
  if (!Number.isFinite(innerRadius) || !Number.isFinite(outerRadius) ||
    innerRadius <= 0 || outerRadius <= innerRadius) {
    throw new RangeError('Radii must satisfy 0 < innerRadius < outerRadius.');
  }

  const point = (radius: number, angle: number) => [radius * Math.cos(angle), radius * Math.sin(angle)];
  const step = 2 * Math.PI / count;

  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + index * step;
    const start = angle - step / 2;
    const end = angle + step / 2;
    const [x, y] = point((innerRadius + outerRadius) / 2, angle);
    // A complete circle needs two arcs; a single SVG arc with equal ends is empty.
    const path = count === 1
      ? `M 0 ${-outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 0 ${outerRadius}
         A ${outerRadius} ${outerRadius} 0 1 1 0 ${-outerRadius} Z
         M 0 ${-innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 0 ${innerRadius}
         A ${innerRadius} ${innerRadius} 0 1 0 0 ${-innerRadius} Z`
      : `M ${point(outerRadius, start)} A ${outerRadius} ${outerRadius} 0 0 1 ${point(outerRadius, end)}
         L ${point(innerRadius, end)} A ${innerRadius} ${innerRadius} 0 0 0 ${point(innerRadius, start)} Z`;
    return { path, x, y };
  });
}
