/**
 * Both "About % through the data" and "About % through the time range" store a FRACTION in [0, 1]
 * (the protobuf contract), but a percentage is the natural thing to put in front of a user. These
 * two functions are the whole conversion, and the only place the 0-100 range is enforced on the way
 * in - the server rejects a fraction outside [0.0, 1.0] outright, so an invalid percent must never
 * reach the model.
 *
 * Shared deliberately: the two modes differ in what the percentage is OF, never in how it is typed,
 * so a divergence here would be a defect in one of them rather than a feature.
 */

/** Default for a freshly-picked approximate mode: the middle of whatever it is a proportion of. */
export const defaultApproximateFraction = 0.5;

/** Digits kept when converting back and forth - 4 decimal places of a percent, i.e. 1 part in 10^6. */
const percentDecimals = 4;

/**
 * A stored fraction rendered as the percent shown in the input.
 *
 * `Number(...)` after `toFixed` strips both the trailing zeros and the binary-float debris:
 * `0.33 * 100` is `33.000000000000004`, which nobody wants to see in a form field.
 */
export function percentFromFraction(fraction: number): string {
  if (!Number.isFinite(fraction)) {
    return '';
  }

  return String(Number((fraction * 100).toFixed(percentDecimals)));
}

/**
 * A percent as typed, converted to the fraction the model stores - or `undefined` when the text is
 * not a percentage in [0, 100]. `undefined` means "refuse this", never "use zero".
 *
 * The regexp is deliberately stricter than `Number()`, which happily accepts `''` (0), `'0x10'` (16)
 * and `'1e2'` (100) - none of which a user meant to type into a percentage field.
 */
export function fractionFromPercent(raw: string): number | undefined {
  const trimmed = raw.trim();

  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
    return undefined;
  }

  const percent = Number(trimmed);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return undefined;
  }

  return Number((percent / 100).toFixed(percentDecimals + 2));
}
