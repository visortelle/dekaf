import { MemorySize } from "./types";

export function memoryToBytes(memory: MemorySize): number {
  switch (memory.unit) {
    case 'M': return memory.size * 1024 * 1024;
    case 'G': return memory.size * 1024 * 1024 * 1024;
  }
}

export function bytesToMemorySize(bytes: number): MemorySize {
  if (bytes < 1024 * 1024 * 1024) {
    return { size: bytes / 1024 / 1024, unit: 'M' };
  } else {
    return { size: bytes / 1024 / 1024 / 1024, unit: 'G' };
  }
}
