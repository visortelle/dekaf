import { MemorySize } from "./types";

export function memoryToBytes(memory: MemorySize): number {
  switch (memory.unit) {
    case 'B': return memory.size;
    case 'KB': return memory.size * 1024;
    case 'MB': return memory.size * 1024 * 1024;
    case 'GB': return memory.size * 1024 * 1024 * 1024;
  }
}

export function bytesToMemorySize(bytes: number): MemorySize {
  if (bytes < 1024) {
    return { size: bytes, unit: 'B' };
  } else if (bytes < 1024 * 1024) {
    return { size: bytes / 1024, unit: 'KB' };
  } else if (bytes < 1024 * 1024 * 1024) {
    return { size: bytes / 1024 / 1024, unit: 'MB' };
  } else {
    return { size: bytes / 1024 / 1024 / 1024, unit: 'GB' };
  }
}
