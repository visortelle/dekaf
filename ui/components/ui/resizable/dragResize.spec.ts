/** @jest-environment jsdom */

import { beginHorizontalDragResize, beginVerticalDragResize } from './dragResize';

describe('dragResize', () => {
  let nextFrameId: number;
  let animationFrames: Map<number, FrameRequestCallback>;
  let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame | undefined;
  let originalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame | undefined;

  const flushAnimationFrames = () => {
    const pending = Array.from(animationFrames.values());
    animationFrames.clear();
    pending.forEach((callback) => callback(0));
  };

  beforeEach(() => {
    nextFrameId = 1;
    animationFrames = new Map();
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId++;
      animationFrames.set(frameId, callback);
      return frameId;
    });
    globalThis.cancelAnimationFrame = jest.fn((frameId: number) => {
      animationFrames.delete(frameId);
    });
  });

  afterEach(() => {
    // Also releases listeners if a failed assertion interrupted a test before its own pointerup.
    document.dispatchEvent(new MouseEvent('pointerup'));
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');

    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
    }
  });

  // The drag listens for POINTER events (touch fires no mouse events mid-drag). jsdom has no
  // PointerEvent constructor, and the handlers only read MouseEvent fields - so a MouseEvent
  // dispatched under the pointer event TYPE drives them exactly like a real pointer would.
  it('uses vertical pointer movement and reverses it for a bottom pane', () => {
    const onChange = jest.fn();
    const onEnd = jest.fn();

    beginVerticalDragResize({
      startClientY: 200,
      startValue: 300,
      min: 100,
      max: 700,
      sign: -1,
      onChange,
      onEnd,
    });

    // X deliberately moves the opposite way: only the Y coordinate may affect this resize.
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: -1_000, clientY: 150 }));
    flushAnimationFrames();

    expect(onChange).toHaveBeenLastCalledWith(350);
    expect(document.body.style.cursor).toBe('row-resize');

    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(onEnd).toHaveBeenCalledWith(350);
  });

  it('clamps a vertical resize at both bounds', () => {
    const onChange = jest.fn();

    beginVerticalDragResize({
      startClientY: 100,
      startValue: 200,
      min: 120,
      max: 280,
      onChange,
    });

    document.dispatchEvent(new MouseEvent('pointermove', { clientY: -100 }));
    flushAnimationFrames();
    document.dispatchEvent(new MouseEvent('pointermove', { clientY: 500 }));
    flushAnimationFrames();

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([120, 280]);
  });

  // `pointercancel`, not `pointerup`: the browser fires it when it takes the gesture away - a
  // touch interrupted by a system gesture, palm rejection, the pointer leaving the surface. No
  // `pointerup` follows it, so a drag that only listens for `pointerup` never ends: the document
  // keeps its move/up listeners and the page keeps `user-select: none` and the resize cursor, with
  // no gesture left that could clear them. On touch - the only place cancellation is common - that
  // is exactly when an unselectable page with a resize cursor is worst.
  it('ends the drag and restores the page when the pointer gesture is CANCELLED', () => {
    const onChange = jest.fn();
    const onEnd = jest.fn();
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'text';

    beginHorizontalDragResize({
      startClientX: 10,
      startValue: 200,
      min: 100,
      max: 400,
      onChange,
      onEnd,
    });

    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 85 }));
    document.dispatchEvent(new MouseEvent('pointercancel'));

    // The size the user last saw is committed and persisted - the cancellation ends the drag, it
    // does not undo it - and `onEnd` runs, which is what releases the column header's suppressed
    // sort click (useColumnWidths).
    expect(onChange).toHaveBeenLastCalledWith(275);
    expect(onEnd).toHaveBeenCalledWith(275);

    // Nothing of the drag is left on the page...
    expect(document.body.style.cursor).toBe('crosshair');
    expect(document.body.style.userSelect).toBe('text');

    // ...and no listener survives it: a later pointer stroke must not still be resizing.
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 300 }));
    flushAnimationFrames();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('flushes the latest pending value on pointerup and cleans up the drag', () => {
    const onChange = jest.fn();
    const onEnd = jest.fn();
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'text';

    beginHorizontalDragResize({
      startClientX: 10,
      startValue: 200,
      min: 100,
      max: 400,
      onChange,
      onEnd,
    });

    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 85 }));
    expect(onChange).not.toHaveBeenCalled();

    document.dispatchEvent(new MouseEvent('pointerup'));

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(275);
    expect(onEnd).toHaveBeenCalledWith(275);
    expect(document.body.style.cursor).toBe('crosshair');
    expect(document.body.style.userSelect).toBe('text');

    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 200 }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    flushAnimationFrames();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
