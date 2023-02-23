export const shortDurationUnits = ['ms', 's', 'm'] as const;
export type ShortDurationUnit = typeof shortDurationUnits[number];

export type ShortDuration = {
  value: number;
  unit: ShortDurationUnit;
}