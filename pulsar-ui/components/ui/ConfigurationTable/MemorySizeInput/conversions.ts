import { MemorySize } from "./types";

export function memorySizeToBytes(memorySize: MemorySize): number {
  switch (memorySize.unit) {
    case "B":
      return memorySize.size;
    case "KB":
      return memorySize.size * 1024;
    case "MB":
      return memorySize.size * 1024 * 1024;
    case "GB":
      return memorySize.size * 1024 * 1024 * 1024;
  }
}

export function bytesToMemorySize(bytes: number): MemorySize {
  if (bytes < 1024) {
    return { size: bytes, unit: "B" };
  } else if (bytes < 1024 * 1024) {
    return { size: bytes / 1024, unit: "KB" };
  } else if (bytes < 1024 * 1024 * 1024) {
    return { size: bytes / 1024 / 1024, unit: "MB" };
  } else {
    return { size: bytes / 1024 / 1024 / 1024, unit: "GB" };
  }
}
