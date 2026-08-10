import { sortTableData } from './sorting';

type Row = { id: string; value?: number; summary?: boolean };
type Lazy = { value?: number };

const rows: Row[] = [
  { id: 'summary', value: 999, summary: true },
  { id: 'equal-a', value: 2 },
  { id: 'missing' },
  { id: 'low', value: 1 },
  { id: 'equal-b', value: 2 }
];

const sort = (direction: 'asc' | 'desc', isMissing = false): string[] =>
  sortTableData<Row, Lazy>({
    data: rows,
    direction,
    entryOf: (data) => ({ data, lazyData: undefined }),
    sortFn: (a, b) => (a.data.value ?? 0) - (b.data.value ?? 0),
    isSortValueMissing: isMissing ? (entry) => entry.data.value === undefined : undefined,
    pinFirst: (row) => row.summary === true
  }).map((row) => row.id);

describe('sortTableData', () => {
  it('sorts both directions, keeps equal rows stable, and pins summaries after sorting', () => {
    expect(sort('asc')).toEqual(['summary', 'missing', 'low', 'equal-a', 'equal-b']);
    expect(sort('desc')).toEqual(['summary', 'equal-a', 'equal-b', 'low', 'missing']);
  });

  it('keeps missing values last in both directions', () => {
    expect(sort('asc', true)).toEqual(['summary', 'low', 'equal-a', 'equal-b', 'missing']);
    expect(sort('desc', true)).toEqual(['summary', 'equal-a', 'equal-b', 'low', 'missing']);
  });

  it('passes lazy values to the comparator and missing-value predicate', () => {
    const lazyById: Record<string, Lazy | undefined> = {
      a: { value: 10 },
      b: undefined,
      c: { value: 5 }
    };
    const lazyRows: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const sorted = sortTableData<Row, Lazy>({
      data: lazyRows,
      direction: 'desc',
      entryOf: (data) => ({ data, lazyData: lazyById[data.id] }),
      sortFn: (a, b) => (a.lazyData?.value ?? 0) - (b.lazyData?.value ?? 0),
      isSortValueMissing: (entry) => entry.lazyData?.value === undefined
    });

    expect(sorted.map((row) => row.id)).toEqual(['a', 'c', 'b']);
  });
});
