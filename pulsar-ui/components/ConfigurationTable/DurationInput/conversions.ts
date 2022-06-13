import { Duration } from "./types";

export function durationToSeconds(duration: Duration): number {
  switch (duration.unit) {
    case "s":
      return duration.value;
    case "m":
      return duration.value * 60;
    case "h":
      return duration.value * 60 * 60;
    case "d":
      return duration.value * 60 * 60 * 24;
  }
}

export function secondsToDuration(seconds: number): Duration {
  if (seconds < 60) {
    return { value: seconds, unit: "s" };
  } else if (seconds < 60 * 60) {
    return { value: seconds / 60, unit: "m" };
  } else if (seconds < 60 * 60 * 24) {
    return { value: seconds / 60 / 60, unit: "h" };
  } else {
    return { value: seconds / 60 / 60 / 24, unit: "d" };
  }
}
