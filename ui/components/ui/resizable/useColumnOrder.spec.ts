/**
 * The pure halves of draggable column reorder: what a saved order means once the column set has
 * changed underneath it, and what one drag does to the list. The DOM half (drag events on the
 * shared Table's headers) is pinned end to end; these are the rules it applies.
 */
import { moveColumnBefore, reconcileColumnOrder } from './useColumnOrder';

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

describe('moveColumnBefore', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('moves the dragged column immediately before the target', () => {
    expect(moveColumnBefore(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves forward too - dropping on a later column', () => {
    expect(moveColumnBefore(order, 'a', 'd')).toEqual(['b', 'c', 'a', 'd']);
  });

  it("'end' puts the dragged column last", () => {
    expect(moveColumnBefore(order, 'b', 'end')).toEqual(['a', 'c', 'd', 'b']);
  });

  it('dropping a column on itself changes nothing', () => {
    expect(moveColumnBefore(order, 'c', 'c')).toEqual(order);
  });

  it('an unknown dragged or target key changes nothing', () => {
    expect(moveColumnBefore(order, 'x' as never, 'b')).toEqual(order);
    expect(moveColumnBefore(order, 'b', 'x' as never)).toEqual(order);
  });
});
