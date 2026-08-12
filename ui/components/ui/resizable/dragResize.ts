type CommonDragResizeOptions = {
  startValue: number;
  min: number;
  max: number;
  sign?: 1 | -1;
  onChange: (value: number) => void;
  onEnd?: (value: number) => void;
};

export type DragResizeOptions = CommonDragResizeOptions & {
  startClientX: number;
};

export type VerticalDragResizeOptions = CommonDragResizeOptions & {
  startClientY: number;
};

function beginDragResize(
  opts: CommonDragResizeOptions,
  startClientPosition: number,
  currentClientPosition: (event: MouseEvent) => number,
  cursor: 'col-resize' | 'row-resize',
): void {
  const sign = opts.sign ?? 1;
  let raf = 0;
  let latest = opts.startValue;
  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;

  // POINTER events, not mouse events: a mouse fires both, but a touch drag fires only pointer
  // events - with mouse listeners a touch could start a resize (via a pointerdown handler) and
  // then never move or end it. The handlers only read client coordinates, which every pointer
  // event carries (PointerEvent extends MouseEvent).
  const onMove = (e: MouseEvent) => {
    latest = Math.min(opts.max, Math.max(opts.min, Math.round(
      opts.startValue + sign * (currentClientPosition(e) - startClientPosition)
    )));
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        opts.onChange(latest);
      });
    }
  };

  // THE one way a drag ends, for every terminal event: commit what the user last saw, then undo
  // everything the drag put on the document. It has to be idempotent - `pointercancel` is often
  // followed by nothing at all, but a real browser can also deliver blur alongside an end - and it
  // must run for `pointercancel` too. That event is how the browser TAKES a gesture away (a touch
  // interrupted by a system gesture, palm rejection); no `pointerup` follows it, so ending only on
  // `pointerup` left the document listeners installed and the page stuck unselectable under a
  // resize cursor, with no remaining gesture that could clear them.
  let isEnded = false;
  const onEnd = () => {
    if (isEnded) {
      return;
    }
    isEnded = true;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    opts.onChange(latest);
    opts.onEnd?.(latest);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onEnd);
    document.removeEventListener('pointercancel', onEnd);
    window.removeEventListener('blur', onEnd);
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onEnd);
  document.addEventListener('pointercancel', onEnd);
  window.addEventListener('blur', onEnd);
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
}

export function beginHorizontalDragResize(opts: DragResizeOptions): void {
  beginDragResize(opts, opts.startClientX, event => event.clientX, 'col-resize');
}

export function beginVerticalDragResize(opts: VerticalDragResizeOptions): void {
  beginDragResize(opts, opts.startClientY, event => event.clientY, 'row-resize');
}
