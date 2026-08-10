import { useCallback } from 'react';
import useLocalStorage from 'use-local-storage-state';

/**
 * Persisted per-table column order - the reorder sibling of `useColumnWidths`, stored under
 * `table:{tableId}:column-order` as the full ordered list of column keys.
 *
 * The stored order is reconciled against the CURRENT default order on every read: keys that no
 * longer exist are dropped, and keys the build added since the order was saved are inserted next
 * to their default neighbours - so a saved order never hides a new column and never crashes on a
 * removed one.
 */
export function useColumnOrder<CK extends string>(
  tableId: string,
  defaultOrder: CK[],
): { order: CK[]; moveColumn: (dragged: CK, target: CK) => void } {
  const [stored, setStored] = useLocalStorage<string[]>(`table:${tableId}:column-order`, { defaultValue: [] });

  const order = reconcileColumnOrder(defaultOrder, stored);

  const moveColumn = useCallback(
    (dragged: CK, target: CK) => {
      setStored((prev) => moveColumnTo(reconcileColumnOrder(defaultOrder, prev ?? []), dragged, target));
    },
    // The default order is a render-stable list of literals in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStored, defaultOrder.join('\u0000')],
  );

  return { order, moveColumn };
}

/** The stored order, made safe against a changed column set. Exported for tests. */
export function reconcileColumnOrder<CK extends string>(defaultOrder: CK[], stored: string[]): CK[] {
  const known = stored.filter((key): key is CK => (defaultOrder as string[]).includes(key));
  const result: CK[] = Array.from(new Set(known));
  defaultOrder.forEach((key) => {
    if (result.includes(key)) {
      return;
    }
    // A column the saved order has never seen: place it after its nearest PRECEDING default
    // neighbour that survived, so a new column appears where the design put it instead of
    // being exiled to the end.
    const defaultIndex = defaultOrder.indexOf(key);
    let insertAt = 0;
    for (let i = defaultIndex - 1; i >= 0; i--) {
      const at = result.indexOf(defaultOrder[i]);
      if (at >= 0) {
        insertAt = at + 1;
        break;
      }
    }
    result.splice(insertAt, 0, key);
  });
  return result;
}

/**
 * `dragged` moved to `target`'s position, everything else stable.
 *
 * A drop lands on ONE header and that whole header highlights, so the gesture reads as "put the
 * dragged column where this one is" - and that is what it does: dropping on a later column pushes
 * the target and everything between it back, dropping on an earlier one pushes them forward.
 *
 * Reading every drop as "insert BEFORE the target" instead would leave the LAST position
 * unreachable by any gesture, because reaching it would need a header to the right of the last one
 * to drop on, and there is none.
 */
export function moveColumnTo<CK extends string>(order: CK[], dragged: CK, target: CK): CK[] {
  const at = order.indexOf(target);
  if (dragged === target || at < 0 || !order.includes(dragged)) {
    return order;
  }
  const without = order.filter((key) => key !== dragged);
  return [...without.slice(0, at), dragged, ...without.slice(at)];
}
