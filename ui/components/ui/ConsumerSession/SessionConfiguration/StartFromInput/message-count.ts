/**
 * The count of messages behind "Skip first n messages" and "Latest n messages".
 *
 * Both are a whole number of messages, at least zero, that the server has to be able to act on. The
 * field used to commit `parseInt` of whatever was on screen after every keystroke, and `parseInt`
 * answers something for nearly anything: `''` is NaN, `'2.7'` is 2, `'1e3'` is 1, and anything past
 * 2^53 comes back as a different number than was typed. None of those are refusals, so each one
 * became a start position the user never asked for. The server now refuses negatives too
 * (startFromCountRejectionReason), so this field is the first line of defence, not the only one.
 */

/**
 * The largest "Latest n messages" the server accepts - the mirror of `latestNMaxAccepted` in
 * `server/.../handleStartFrom.scala`, enforced there by `startFromCountRejectionReason`.
 *
 * Not a memory bound: the last n are resolved by a backward walk over entry METADATA (nothing is
 * retained), but that walk costs one broker lookup per entry, runs while session creation is
 * blocked, and reports no progress - so a larger n is a request the server refuses outright. This
 * constant MUST track the server's: when it lagged behind (the server tightened to ten million
 * while this stayed at Int.MaxValue), every value in between validated here, was committed, and
 * failed only after Play - with the field it came from long out of sight. The parity is pinned by
 * test on both sides.
 *
 * "Skip first n messages" has no such ceiling on purpose - it streams past its messages rather
 * than holding them, and it reports progress while it does - so this is a per-MODE limit, not a
 * limit on counts.
 */
export const latestMessageCountMax = 10_000_000;

/**
 * The count a text field means, or `undefined` when it does not mean one. `undefined` is "refuse
 * this", never "use zero".
 *
 * Deliberately stricter than `Number()`: no sign, no decimal point, no exponent, nothing outside the
 * range where an integer survives the round trip through a double, and nothing above the mode's own
 * maximum where it has one.
 */
export function messageCountFromText(raw: string, max?: number): number | undefined {
  const trimmed = raw.trim();

  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  const count = Number(trimmed);
  if (!Number.isSafeInteger(count)) {
    return undefined;
  }

  if (max !== undefined && count > max) {
    return undefined;
  }

  return count;
}
