import { ShortDuration } from "./types";

export const durationToMilliseconds = (duration: ShortDuration): number => {
  switch (duration.unit) {
    case "ms":
      return duration.value
    case "s":
      return duration.value * 1000;
    case "m":
      return duration.value * 1000 * 60;
  }
}

export const millisecondsToDuration = (milliseconds: number): ShortDuration => {
  if (milliseconds < 1000) {
    return { value: milliseconds, unit: 'ms' };
  } else if (milliseconds < 1000 * 60) {
    return { value: milliseconds / 1000, unit: 's' };
  } else {
    return { value: milliseconds / 1000 / 60, unit: 'm' };
  }
}