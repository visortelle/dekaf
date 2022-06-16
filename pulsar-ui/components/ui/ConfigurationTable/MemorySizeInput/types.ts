export const memoryUnits = ["M", "G"] as const;
export type MemoryUnit = typeof memoryUnits[number];

export type MemorySize = {
  size: number;
  unit: MemoryUnit;
};
