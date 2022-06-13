export const durationUnits = ["s", "m", "h", "d"] as const;
export type DurationUnit = typeof durationUnits[number];

export type Duration = {
  value: number;
  unit: DurationUnit;
};
