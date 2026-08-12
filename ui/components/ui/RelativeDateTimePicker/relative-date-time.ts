/**
 * How far back "n <unit> ago" is allowed to be.
 *
 * The model is a protobuf `int32` (`RelativeDateTime.value`, Scala `Int`), and the server subtracts
 * it from "now" without a trust-boundary check of its own - so whatever this field commits IS the
 * instant the session starts from. `Number()` accepts far more than that model can carry, and every
 * excess value is silently coerced rather than refused:
 *
 * - blank becomes 0, which reads as "now" rather than as "nothing entered";
 * - a negative is subtracted as a negative, i.e. an instant in the FUTURE, under a label that says
 *   "ago";
 * - anything past 2,147,483,647 wraps on the wire into a negative, with the same effect.
 */
export const relativeDateTimeValueMax = 2147483647;

/**
 * The number of units a text field means, or `undefined` when it does not mean one. `undefined` is
 * "refuse this", never "use zero" - zero is a position the user can ask for on purpose.
 */
export function relativeDateTimeValueFromText(raw: string): number | undefined {
  const trimmed = raw.trim();

  // No sign, no decimal point, no exponent: each of those is a value the int32 model cannot carry
  // as typed, and coercing it silently is what this exists to prevent.
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  const value = Number(trimmed);
  if (value > relativeDateTimeValueMax) {
    return undefined;
  }

  return value;
}
