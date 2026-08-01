/**
 * How many messages a session keeps on screen.
 *
 * The limit is what stops a long-running session from growing until the tab dies, and it is applied
 * as `messages.slice(-limit)`. That expression turns EVERY non-positive limit into "keep
 * everything": `slice(-0)` is `slice(0)`, i.e. the whole array, and so is `slice(-NaN)`. So a limit
 * of zero - which is what an emptied number field commits, and what a saved session can carry -
 * silently removes the very limit it configures, and the browser buffer grows without bound.
 *
 * A fractional or negative limit is no better: `slice(-2.5)` drops a different number of messages
 * than either 2 or 3 would, and `slice(5)` (from a limit of -5) drops the OLDEST messages from the
 * front while keeping everything after them.
 *
 * Hence one definition of the domain, used by the field that edits it, by the conversion that reads
 * a persisted config, and by the retention itself.
 */

export const defaultNumDisplayItems = 10_000;

/**
 * The limit a text field means, or `undefined` when it does not mean one. `undefined` is "refuse
 * this" - there is no sensible "0 messages on screen", so zero is refused rather than reinterpreted.
 */
export function numDisplayItemsFromText(raw: string): number | undefined {
  const trimmed = raw.trim();

  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  const count = Number(trimmed);
  if (!Number.isSafeInteger(count) || count < 1) {
    return undefined;
  }

  return count;
}

/**
 * The limit to actually apply, given whatever a persisted config carries.
 *
 * A stored spec is a TRUST BOUNDARY: it is JSON on disk, written by an older build, hand-edited, or
 * committed by a field that did not validate. Anything that is not a usable limit falls back to the
 * default rather than disabling retention.
 */
export function displayItemLimit(stored: number | undefined): number {
  if (stored === undefined || !Number.isSafeInteger(stored) || stored < 1) {
    return defaultNumDisplayItems;
  }

  return stored;
}
