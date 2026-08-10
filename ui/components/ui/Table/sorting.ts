export type TableSortEntry<DE, LD> = {
  data: DE;
  lazyData: LD | undefined;
};

type SortTableDataOptions<DE, LD> = {
  data: DE[];
  direction: 'asc' | 'desc';
  sortFn: (a: TableSortEntry<DE, LD>, b: TableSortEntry<DE, LD>) => number;
  entryOf: (data: DE) => TableSortEntry<DE, LD>;
  isSortValueMissing?: (entry: TableSortEntry<DE, LD>) => boolean;
  pinFirst?: (data: DE) => boolean;
};

/** Sort one table column without coupling direction to absence or pinning. */
export function sortTableData<DE, LD>(options: SortTableDataOptions<DE, LD>): DE[] {
  const direction = options.direction === 'asc' ? 1 : -1;
  const sorted = [...options.data].sort((a, b) => {
    const aEntry = options.entryOf(a);
    const bEntry = options.entryOf(b);
    const aMissing = options.isSortValueMissing?.(aEntry) === true;
    const bMissing = options.isSortValueMissing?.(bEntry) === true;

    // Absence is a separate ordering dimension: it stays last rather than becoming "largest" or
    // "smallest" when direction flips. Returning zero for two missing values preserves row order.
    if (aMissing !== bMissing) {
      return aMissing ? 1 : -1;
    }
    if (aMissing) {
      return 0;
    }

    // Multiplying the comparator, instead of reversing an ascending result, also preserves the
    // original order of equal populated rows in descending mode.
    return direction * options.sortFn(aEntry, bEntry);
  });

  if (options.pinFirst === undefined) {
    return sorted;
  }

  // Summary rows describe the table rather than compete with it, so pin only after sorting.
  return [
    ...sorted.filter((row) => options.pinFirst?.(row) === true),
    ...sorted.filter((row) => options.pinFirst?.(row) !== true)
  ];
}
