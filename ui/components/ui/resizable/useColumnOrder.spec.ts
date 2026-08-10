/**
 * The pure halves of draggable column reorder: what a saved order means once the column set has
 * changed underneath it, and what one drag does to the list. The DOM half (drag events on the
 * shared Table's headers) is pinned end to end; these are the rules it applies.
 */
import { moveColumnTo, reconcileColumnOrder } from './useColumnOrder';

describe('reconcileColumnOrder', () => {
  const defaults = ['a', 'b', 'c', 'd'];

  it('an empty store means the default order', () => {
    expect(reconcileColumnOrder(defaults, [])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a full saved order wins as saved', () => {
    expect(reconcileColumnOrder(defaults, ['d', 'b', 'a', 'c'])).toEqual(['d', 'b', 'a', 'c']);
  });

  it('a key that no longer exists is dropped, not crashed on', () => {
    expect(reconcileColumnOrder(defaults, ['gone', 'c', 'a', 'b', 'd'])).toEqual(['c', 'a', 'b', 'd']);
  });

  it('a NEW column appears next to its default neighbour, not exiled to the end', () => {
    // The saved order predates column 'c'; 'c' follows 'b' by default, so it lands after 'b'.
    expect(reconcileColumnOrder(defaults, ['d', 'b', 'a'])).toEqual(['d', 'b', 'c', 'a']);
  });

  it('a new FIRST column with no surviving predecessor lands first', () => {
    expect(reconcileColumnOrder(defaults, ['c', 'b', 'd'])).toEqual(['a', 'c', 'b', 'd']);
  });

  it('a duplicated stored key (a corrupt store) collapses to one', () => {
    expect(reconcileColumnOrder(defaults, ['b', 'b', 'a', 'c', 'd'])).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('moveColumnTo', () => {
  const order = ['a', 'b', 'c', 'd'];

  // One drop = "put the dragged column where the target is". Dropping on an EARLIER column pushes
  // the target back, dropping on a LATER one pulls it forward - so the dragged column always ends
  // up at the index the target had, and every position is reachable by some drop. The whole header
  // is the drop target and it highlights as one, which is what makes that the reading.
  it('takes the position of a target to its LEFT', () => {
    expect(moveColumnTo(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('takes the position of a target to its RIGHT', () => {
    expect(moveColumnTo(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  // The position the old "always insert before the target" rule could not express: there is no
  // header to the right of the last one, so nothing could ever be dropped past it.
  it('dropping on the LAST column puts the dragged column last', () => {
    expect(moveColumnTo(order, 'a', 'd')).toEqual(['b', 'c', 'd', 'a']);
  });

  it('dropping on the FIRST column puts the dragged column first', () => {
    expect(moveColumnTo(order, 'c', 'a')).toEqual(['c', 'a', 'b', 'd']);
  });

  it('dropping a column on itself changes nothing', () => {
    expect(moveColumnTo(order, 'c', 'c')).toEqual(order);
  });

  it('an unknown dragged or target key changes nothing', () => {
    expect(moveColumnTo(order, 'x' as never, 'b')).toEqual(order);
    expect(moveColumnTo(order, 'b', 'x' as never)).toEqual(order);
  });
});
