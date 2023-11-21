type SortItem = {
  base: string;
  partition: number | null;
};

export function customTopicsNamesSort(a: string, b: string): number {
  const parseItem = (s: string): SortItem => {
    const match = s.match(/(.*?)(-partition-(\d+))?$/);
    if (match) {
      return {
        base: match[1],
        partition: match[3] !== undefined ? parseInt(match[3], 10) : null
      };
    }
    return {
      base: s,
      partition: null
    };
  };

  const itemA = parseItem(a);
  const itemB = parseItem(b);

  if (itemA.base === itemB.base) {
    if (itemA.partition === null) return -1;
    if (itemB.partition === null) return 1;
    return itemA.partition - itemB.partition;
  }

  return itemA.base.localeCompare(itemB.base, 'en', { numeric: true });
}
