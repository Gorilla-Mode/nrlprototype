// TEMPORARY debugging for the intermittent "report button does not open the form" bug.
// Every line starts with [REPORT-DEBUG]. Remove this file and its calls once the bug is fixed.

const prefix = '[REPORT-DEBUG]';

/** One log line: prefix, ISO timestamp, what happened, and details as JSON (copyable as text). */
export function reportDebug(event: string, details: Record<string, unknown> = {}): void {
  let json: string;
  try {
    json = JSON.stringify(details);
  } catch {
    json = String(details);
  }
  console.log(`${prefix} ${new Date().toISOString()} ${event} ${json}`);
}

/** "button.error-report-button[aria-label=Rapporter feil på hinder]" for an event target. */
export function describeTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) return String(target);
  const element = target.closest('button, a, input, select, textarea, dialog, canvas, [role]') ?? target;
  const classes = typeof element.className === 'string' && element.className.trim()
    ? `.${element.className.trim().split(/\s+/).filter((name) => !name.startsWith('svelte-')).join('.')}` : '';
  const label = element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? '';
  return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classes}${label ? `[${label}]` : ''}`;
}

/** Which watched area an event hit, or null when it is none of them. */
function watchedArea(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('[aria-label="Rapporter feil på hinder"]')) return 'error-report button';
  const button = target.closest('button');
  if (button?.textContent?.trim() === 'Report obstacle') return 'Report obstacle button';
  if (target.closest('dialog')) return 'form/dialog';
  if (target.closest('.drawing-toolbar, .error-report-toolbar')) return 'bottom toolbar';
  if (target.closest('.maplibregl-canvas, .maplibregl-canvas-container')) return 'map canvas';
  return null;
}

/**
 * Logs raw input on the report buttons, forms, bottom toolbars and the map, in the capture
 * phase, before any handler can stop it: shows double events (pointer + touch + click) and
 * presses that move far enough to count as a drag. Returns the cleanup.
 */
export function watchReportInputs(): () => void {
  const types = ['pointerdown', 'pointerup', 'pointercancel', 'click', 'touchstart', 'touchend', 'touchcancel'] as const;
  let down: { x: number; y: number; time: number } | null = null;
  const listener = (event: Event) => {
    const area = watchedArea(event.target);
    if (!area) return;
    const details: Record<string, unknown> = { type: event.type, area, target: describeTarget(event.target), defaultPrevented: event.defaultPrevented };
    if (event instanceof PointerEvent) {
      details.pointerType = event.pointerType;
      details.x = Math.round(event.clientX);
      details.y = Math.round(event.clientY);
      if (event.type === 'pointerdown') down = { x: event.clientX, y: event.clientY, time: performance.now() };
      if ((event.type === 'pointerup' || event.type === 'pointercancel') && down) {
        details.movedPx = Math.round(Math.hypot(event.clientX - down.x, event.clientY - down.y));
        details.heldMs = Math.round(performance.now() - down.time);
        down = null;
      }
    }
    reportDebug(`input ${event.type}`, details);
  };
  for (const type of types) document.addEventListener(type, listener, { capture: true, passive: true });
  return () => { for (const type of types) document.removeEventListener(type, listener, { capture: true }); };
}
