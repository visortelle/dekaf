export const memoryUnits = ["B", "KB", "MB", "GB"] as const;
export type MemoryUnit = typeof memoryUnits[number];

export type MemorySize = {
  size: number;
  unit: MemoryUnit;
};
