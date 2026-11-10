/** Base time a confirmation stays, before reading time is added. */
const baseMs = 5000;
/** One extra second per started group of this many words. */
const wordsPerSecond = 10;

/** How long a confirmation stays: 5 s plus 1 s per 10 words of title and text, rounded up. */
export function confirmationDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return baseMs + Math.ceil(words / wordsPerSecond) * 1000;
}
