import React, { useLayoutEffect, useRef, useState } from 'react';
import s from './PaneResizeHandle.module.css';
import { PaneKeyboardResizeIntent } from './useResizablePane';

/**
 * What keyboard operability needs to know about the pane being sized. `UseResizablePane` satisfies
 * it as-is, so a call site wires the whole thing with `pane={thePane}`. Without it the handle is a
 * drag-only, non-focusable separator (the ratio-based splits have no fixed value to report).
 */
export type PaneResizeHandleKeyboardTarget = {
  size: number;
  minSize: number;
  maxSize: number;
  keyboardResize: (intent: PaneKeyboardResizeIntent, renderedSize?: number) => void;
};

export const PaneResizeHandle: React.FC<{
  onResizeStart: (startClientPosition: number, containerSize: number) => void,
  resizeAxis?: 'horizontal' | 'vertical',
  mode?: 'inline' | 'edge',
  edgeSide?: 'start' | 'end',
  title?: string,
  testId?: string,
  className?: string,
  pane?: PaneResizeHandleKeyboardTarget,
}> = ({
  onResizeStart,
  resizeAxis = 'horizontal',
  mode = 'inline',
  edgeSide = 'end',
  title = 'Drag to resize',
  testId,
  className,
  pane,
}) => {
  // ARIA orientation describes the SEPARATOR, not the drag axis: a handle dragged horizontally is
  // a vertical bar between side-by-side panes, and vice versa. The arrow keys follow the same
  // geometry - the pair that moves along the drag axis operates the splitter (WAI-ARIA window
  // splitter pattern), the perpendicular pair is left alone.
  const orientation = resizeAxis === 'vertical' ? 'horizontal' : 'vertical';

  const handleRef = useRef<HTMLDivElement | null>(null);

  // The pane as LAID OUT, which a responsive cap can make smaller than the stored preference the
  // pane hook reports. Both halves of the control need it: an arrow key must step from what is on
  // screen (the pointer path already does), and aria-valuenow must describe the separator where it
  // actually sits. Measured from the same element the pointer path measures - the handle's pane.
  const measurePane = (): number | undefined => {
    const rect = handleRef.current?.parentElement?.getBoundingClientRect();
    const measured = resizeAxis === 'vertical' ? rect?.height : rect?.width;
    return measured !== undefined && measured > 0 ? measured : undefined;
  };

  const [renderedSize, setRenderedSize] = useState<number | undefined>(undefined);
  // After every size change, and on arrival - a focused separator is when the value is announced.
  // No observer: a viewport change with no size change is picked up by the focus that has to
  // precede any keystroke anyway, which keeps this to two cheap measurements.
  useLayoutEffect(() => {
    if (pane !== undefined) {
      setRenderedSize(measurePane());
    }
  }, [pane?.size, resizeAxis]);

  // What the pane REPORTS is the fallback: before the first layout, and wherever nothing measures
  // (the value would otherwise read 0 and describe a collapsed pane that is not there).
  const reportedSize = renderedSize ?? pane?.size;

  const keyboardIntent = (key: string): PaneKeyboardResizeIntent | undefined => {
    if (key === 'Home') {
      return 'min';
    }
    if (key === 'End') {
      return 'max';
    }
    if (resizeAxis === 'vertical') {
      return key === 'ArrowUp' ? 'toward-start' : key === 'ArrowDown' ? 'toward-end' : undefined;
    }
    return key === 'ArrowLeft' ? 'toward-start' : key === 'ArrowRight' ? 'toward-end' : undefined;
  };

  return (
    <div
      ref={handleRef}
      className={[
        s.PaneResizeHandle,
        resizeAxis === 'vertical' ? s.Vertical : s.Horizontal,
        mode === 'edge' ? s.Edge : '',
        mode === 'edge' && edgeSide === 'start' ? s.EdgeStart : '',
        mode === 'edge' && edgeSide === 'end' ? s.EdgeEnd : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      data-testid={testId}
      data-resize-axis={resizeAxis}
      title={title}
      role="separator"
      aria-orientation={orientation}
      aria-label={title}
      // Focusable only when the keys actually do something: a tab stop that swallows arrows and
      // does nothing is worse for a keyboard user than no stop at all.
      tabIndex={pane === undefined ? undefined : 0}
      aria-valuenow={reportedSize === undefined ? undefined : Math.round(reportedSize)}
      aria-valuemin={pane === undefined ? undefined : Math.round(pane.minSize)}
      aria-valuemax={pane === undefined ? undefined : Math.round(pane.maxSize)}
      onFocus={() => {
        if (pane !== undefined) {
          setRenderedSize(measurePane());
        }
      }}
      // pointerdown, not mousedown: a touch drag fires only pointer events, and the drag helper
      // listens for pointermove/pointerup to match. The stylesheet sets `touch-action: none` so
      // the browser does not claim the gesture for scrolling first.
      onPointerDown={(e) => {
        if (e.button !== 0) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const containerRect = e.currentTarget.parentElement?.getBoundingClientRect();
        const startClientPosition = resizeAxis === 'vertical' ? e.clientY : e.clientX;
        const containerSize = resizeAxis === 'vertical' ? containerRect?.height ?? 0 : containerRect?.width ?? 0;
        onResizeStart(startClientPosition, containerSize);
      }}
      onKeyDown={(e) => {
        if (pane === undefined) {
          return;
        }
        const intent = keyboardIntent(e.key);
        if (intent === undefined) {
          return;
        }
        // The arrows resize the pane; without this they would also scroll whatever contains it.
        e.preventDefault();
        e.stopPropagation();
        // Measured now rather than read from state: the layout can have changed since the last
        // render, and a step from a stale number is the whole defect this guards.
        pane.keyboardResize(intent, measurePane());
      }}
    />
  );
};

export default PaneResizeHandle;
