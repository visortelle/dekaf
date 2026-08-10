/** @jest-environment jsdom */

/**
 * The shared pane resize handle: a `role="separator"` that can be dragged with any pointer and -
 * when handed its pane - operated from the keyboard, with the pane's size surfaced through
 * aria-valuenow/min/max (WAI-ARIA window splitter pattern). The same diff that introduced the
 * panes gave the message table's copy cell keyboard support; this control meets the same bar.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PaneResizeHandle from './PaneResizeHandle';

// jsdom has no PointerEvent constructor; React's root listener only cares about the event TYPE
// and the handler only reads MouseEvent fields, so a bubbling MouseEvent stands in for a pointer.
const pointerDown = (el: Element, init: MouseEventInit) =>
  fireEvent(el, new MouseEvent('pointerdown', { bubbles: true, ...init }));

describe('PaneResizeHandle', () => {
  const renderHandle = (over: Partial<React.ComponentProps<typeof PaneResizeHandle>> = {}) => {
    const onResizeStart = jest.fn();
    const keyboardResize = jest.fn();
    const pane = { size: 300, minSize: 100, maxSize: 800, keyboardResize };
    render(
      <div>
        <PaneResizeHandle testId="handle" onResizeStart={onResizeStart} pane={pane} {...over} />
      </div>
    );
    return { onResizeStart, keyboardResize, handle: screen.getByTestId('handle') };
  };

  it('is a focusable separator that surfaces the pane size to assistive tech', () => {
    const { handle } = renderHandle({ title: 'Drag to resize message inspector' });

    // A handle dragged horizontally is a VERTICAL bar between side-by-side panes.
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.getAttribute('aria-label')).toBe('Drag to resize message inspector');
    expect(handle.getAttribute('aria-valuenow')).toBe('300');
    expect(handle.getAttribute('aria-valuemin')).toBe('100');
    expect(handle.getAttribute('aria-valuemax')).toBe('800');
  });

  it('a vertical-axis handle is a horizontal separator', () => {
    const { handle } = renderHandle({ resizeAxis: 'vertical' });

    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
  });

  // Each press carries the pane as MEASURED, so the step starts from what is on screen rather than
  // from a stored preference a responsive cap has overtaken (see useResizablePane.spec.tsx, which
  // pins that end to end). jsdom lays nothing out, so the measurement here is `undefined` - the
  // hook then falls back to the stored size, exactly as it did before.
  it('horizontal axis: left/right arrows operate the splitter, the perpendicular pair is left alone', () => {
    const { handle, keyboardResize } = renderHandle();

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(keyboardResize).toHaveBeenLastCalledWith('toward-start', undefined);
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(keyboardResize).toHaveBeenLastCalledWith('toward-end', undefined);

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(keyboardResize).toHaveBeenCalledTimes(2);
  });

  it('vertical axis: up/down arrows operate the splitter', () => {
    const { handle, keyboardResize } = renderHandle({ resizeAxis: 'vertical' });

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(keyboardResize).toHaveBeenLastCalledWith('toward-start', undefined);
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(keyboardResize).toHaveBeenLastCalledWith('toward-end', undefined);

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(keyboardResize).toHaveBeenCalledTimes(2);
  });

  it('Home and End jump the splitter to the bounds', () => {
    const { handle, keyboardResize } = renderHandle();

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(keyboardResize).toHaveBeenLastCalledWith('min', undefined);
    fireEvent.keyDown(handle, { key: 'End' });
    expect(keyboardResize).toHaveBeenLastCalledWith('max', undefined);
  });

  it('without a pane it is a plain drag separator: no tab stop, no value, keys inert', () => {
    // The ratio-based splits pass no pane. A focusable separator whose keys do nothing would be
    // worse for a keyboard user than no tab stop at all.
    const { handle } = renderHandle({ pane: undefined });

    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('tabindex')).toBeNull();
    expect(handle.getAttribute('aria-valuenow')).toBeNull();
    expect(() => fireEvent.keyDown(handle, { key: 'ArrowLeft' })).not.toThrow();
  });

  it('a primary-pointer press begins the drag from the pressed coordinate', () => {
    const { handle, onResizeStart } = renderHandle();

    pointerDown(handle, { button: 0, clientX: 42, clientY: 7 });

    // Horizontal axis reads clientX; the second argument is the parent's measured size, which
    // jsdom reports as 0 - the wiring under test is which coordinate is picked and that a
    // POINTER press starts the drag at all (a touch never fires mousedown).
    expect(onResizeStart).toHaveBeenCalledTimes(1);
    expect(onResizeStart).toHaveBeenCalledWith(42, 0);
  });

  it('a vertical-axis press reads the vertical coordinate', () => {
    const { handle, onResizeStart } = renderHandle({ resizeAxis: 'vertical' });

    pointerDown(handle, { button: 0, clientX: 42, clientY: 7 });

    expect(onResizeStart).toHaveBeenCalledWith(7, 0);
  });

  it('a secondary-button press starts nothing', () => {
    const { handle, onResizeStart } = renderHandle();

    pointerDown(handle, { button: 2, clientX: 42 });

    expect(onResizeStart).not.toHaveBeenCalled();
  });
});
