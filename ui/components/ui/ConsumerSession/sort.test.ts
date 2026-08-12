/**
 * BUG-3 regression: sortMessages must not reorder the array it is given.
 *
 * ConsumerSession passes the `messages` React state array straight into sortMessages whenever the
 * session is paused and the search box is empty, so an in-place `sort()`/`reverse()` rewrites state
 * into VISUAL order. The retention logic (`.slice(-numDisplayItems)`) then drops messages by the
 * last visual sort instead of by arrival order.
 */
import { genEmptyMessageDescriptor } from './testing';
import { sortMessages } from './sort';

// Arrival order 3, 1, 2 - deliberately unsorted for every key under test.
const arrivalOrder = [3, 1, 2];
const makeMessages = () =>
  arrivalOrder.map((n) =>
    genEmptyMessageDescriptor({
      displayIndex: n,
      key: `k-${n}`,
      value: `v-${n}`,
      publishTime: n,
      numMessageProcessed: n,
    })
  );

describe('BUG-3: sortMessages is immutable', () => {
  it('sorts by index without touching the input array', () => {
    const input = makeMessages();
    const sorted = sortMessages(input, { key: 'index', direction: 'desc' });

    expect(sorted.map((m) => m.displayIndex)).toEqual([3, 2, 1]);
    expect(input.map((m) => m.displayIndex)).toEqual(arrivalOrder);
    expect(sorted).not.toBe(input);
  });

  it('sorts by key without touching the input array', () => {
    const input = makeMessages();
    const sorted = sortMessages(input, { key: 'key', direction: 'asc' });

    expect(sorted.map((m) => m.key)).toEqual(['k-1', 'k-2', 'k-3']);
    expect(input.map((m) => m.displayIndex)).toEqual(arrivalOrder);
  });

  it('sorts by value without touching the input array', () => {
    const input = makeMessages();
    const sorted = sortMessages(input, { key: 'value', direction: 'desc' });

    expect(sorted.map((m) => m.value)).toEqual(['v-3', 'v-2', 'v-1']);
    expect(input.map((m) => m.displayIndex)).toEqual(arrivalOrder);
  });

  it('keeps arrival order intact across repeated sorts of the same array', () => {
    // The paused session re-sorts the SAME state array on every sort click / re-render.
    const input = makeMessages();
    sortMessages(input, { key: 'index', direction: 'desc' });
    sortMessages(input, { key: 'key', direction: 'asc' });
    sortMessages(input, { key: 'publishTime', direction: 'desc' });

    expect(input.map((m) => m.displayIndex)).toEqual(arrivalOrder);
  });
});
