import { memoryToBytes, bytesToMemorySize } from "./conversions";

describe('memoryToBytes', () => {
  it('should convert memory size to bytes', () => {
    expect(memoryToBytes({ size: 0, unit: 'M' })).toBe(0);
    expect(memoryToBytes({ size: 1, unit: 'M' })).toBe(1024 * 1024);
    expect(memoryToBytes({ size: 2, unit: 'M' })).toBe(1024 * 1024 * 2);
    expect(memoryToBytes({ size: 2.2, unit: 'M' })).toBe(1024 * 1024 * 2.2);

    expect(memoryToBytes({ size: 1, unit: 'G' })).toBe(1024 * 1024 * 1024);
  });
});

describe('bytesToMemorySize', () => {
  it('should convert bytes to memory size', () => {
    expect(bytesToMemorySize(0)).toEqual({ size: 0, unit: 'M' });
    expect(bytesToMemorySize(1024 * 1024)).toEqual({ size: 1, unit: 'M' });

    expect(bytesToMemorySize(1024 * 1024 * 999)).toEqual({ size: 999, unit: 'M' });

    expect(bytesToMemorySize(1024 * 1024 * 1024)).toEqual({ size: 1, unit: 'G' });
    expect(bytesToMemorySize(1024 * 1024 * 1024 * 2.2)).toEqual({ size: 2.2, unit: 'G' });
  });
});
