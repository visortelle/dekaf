import { useCallback, useEffect, useRef } from 'react';
import useLocalStorage from 'use-local-storage-state';
import { beginHorizontalDragResize, beginVerticalDragResize } from './dragResize';

/**
 * A keyboard nudge on a resize handle, expressed in SCREEN direction - `toward-start` is toward
 * the smaller client coordinate (left/up), `toward-end` the larger (right/down) - because that is
 * what an arrow key means. The hook owns the pane's side, so only it can say whether moving the
 * splitter toward the start grows the pane (a right/bottom pane) or shrinks it (a left/top one).
 */
export type PaneKeyboardResizeIntent = 'toward-start' | 'toward-end' | 'min' | 'max';

/** How far one arrow-key press moves the splitter. Held keys repeat, so fine beats fast. */
const keyboardResizeStep = 16;

/**
 * What a resize begins from. A responsive layout may cap the RENDERED pane below its stored
 * preference (both consumer-session panes are capped to 85% of the viewport), and a move has to
 * start from what the user can actually see - otherwise the first presses/pixels are spent walking
 * a number that is nowhere on screen, and the control feels inert. The preference itself is kept:
 * only the starting point moves.
 */
function startFromRendered(renderedSize: number | undefined, storedSize: number): number {
  return renderedSize !== undefined && Number.isFinite(renderedSize) && renderedSize > 0 ? renderedSize : storedSize;
}

export type UseResizablePane = {
  size: number;
  minSize: number;
  maxSize: number;
  startResize: (startClientPosition: number, renderedSize?: number) => void;
  keyboardResize: (intent: PaneKeyboardResizeIntent, renderedSize?: number) => void;
};

export type ResizablePaneOptions = {
  defaultSize: number;
  minSize: number;
  maxSize: number;
  resizeAxis?: 'horizontal' | 'vertical';
  side?: 'left' | 'right' | 'top' | 'bottom';
};

export function useResizablePane(paneId: string, opts: ResizablePaneOptions): UseResizablePane {
  const [storedSize, setSize] = useLocalStorage<number>(`pane:${paneId}:size`, { defaultValue: opts.defaultSize });
  const fallbackSize = Math.min(opts.maxSize, Math.max(opts.minSize, opts.defaultSize));
  const size = Number.isFinite(storedSize)
    ? Math.min(opts.maxSize, Math.max(opts.minSize, storedSize))
    : fallbackSize;

  // Old/corrupt preferences and values written on a larger layout must never make a pane
  // permanently unreachable. Keep the persisted value inside the same bounds used while dragging.
  useEffect(() => {
    if (storedSize !== size) {
      setSize(size);
    }
  }, [size, storedSize, setSize]);

  const sizeRef = useRef(size);
  sizeRef.current = size;

  const { minSize, maxSize } = opts;
  const resizeAxis = opts.resizeAxis ?? (opts.side === 'top' || opts.side === 'bottom' ? 'vertical' : 'horizontal');
  const sign: 1 | -1 = opts.side === 'right' || opts.side === 'bottom' ? -1 : 1;

  const startResize = useCallback((startClientPosition: number, renderedSize?: number) => {
    const common = {
      startValue: startFromRendered(renderedSize, sizeRef.current),
      min: minSize,
      max: maxSize,
      sign,
      onChange: setSize,
    };

    if (resizeAxis === 'vertical') {
      beginVerticalDragResize({ ...common, startClientY: startClientPosition });
    } else {
      beginHorizontalDragResize({ ...common, startClientX: startClientPosition });
    }
  }, [minSize, maxSize, resizeAxis, sign, setSize]);

  // The keyboard half of the handle: one press moves the splitter one step in screen direction,
  // through the same sign, starting point and clamping the drag uses, so an arrow can never take
  // the pane where a drag could not. Home/End are absolute and land on the declared bounds - the
  // pair aria-valuemin/max report - so a responsive cap does not enter into them.
  const keyboardResize = useCallback((intent: PaneKeyboardResizeIntent, renderedSize?: number) => {
    if (intent === 'min') {
      setSize(minSize);
      return;
    }
    if (intent === 'max') {
      setSize(maxSize);
      return;
    }

    const direction = intent === 'toward-start' ? -1 : 1;
    const from = startFromRendered(renderedSize, sizeRef.current);
    setSize(Math.min(maxSize, Math.max(minSize, from + sign * direction * keyboardResizeStep)));
  }, [minSize, maxSize, sign, setSize]);

  return { size, minSize, maxSize, startResize, keyboardResize };
}
