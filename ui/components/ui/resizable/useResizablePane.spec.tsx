/** @jest-environment jsdom */

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaneKeyboardResizeIntent, ResizablePaneOptions, useResizablePane } from './useResizablePane';
import PaneResizeHandle from './PaneResizeHandle';

// The drag helper listens for POINTER events (touch fires no mouse events mid-drag). jsdom has no
// PointerEvent constructor, and the handlers only read MouseEvent fields - so a MouseEvent
// dispatched under the pointer event TYPE drives them exactly like a real pointer would.
const pointerMove = (clientY: number) => fireEvent(document, new MouseEvent('pointermove', { clientY }));
const pointerUp = () => fireEvent(document, new MouseEvent('pointerup'));

type HarnessProps = {
  paneId: string;
  options: ResizablePaneOptions;
  renderedSize?: number;
};

const keyboardIntents: PaneKeyboardResizeIntent[] = ['toward-start', 'toward-end', 'min', 'max'];

function Harness({ paneId, options, renderedSize }: HarnessProps) {
  const pane = useResizablePane(paneId, options);

  return (
    <div>
      <button
        data-testid="resize-handle"
        data-size={pane.size}
        onMouseDown={(event) => pane.startResize(event.clientY, renderedSize)}
      >
        {pane.size}
      </button>
      {keyboardIntents.map((intent) => (
        <button key={intent} data-testid={`kb-${intent}`} onClick={() => pane.keyboardResize(intent)} />
      ))}
    </div>
  );
}

const options: ResizablePaneOptions = {
  defaultSize: 400,
  minSize: 100,
  maxSize: 800,
  resizeAxis: 'vertical',
  side: 'bottom',
};

describe('useResizablePane', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    // Also releases listeners if a failed assertion interrupted a test before its own pointerup.
    document.dispatchEvent(new MouseEvent('pointerup'));
    cleanup();
    window.localStorage.clear();
  });

  it.each([
    ['a value above the maximum', '9999', 800],
    ['a value below the minimum', '-50', 100],
    ['a non-finite value', 'null', 400],
  ])('normalizes %s in both the rendered and persisted preference', async (_case, storedValue, expected) => {
    const paneId = `normalization-${expected}-${storedValue}`;
    const storageKey = `pane:${paneId}:size`;
    window.localStorage.setItem(storageKey, storedValue);

    render(<Harness paneId={paneId} options={options} />);

    expect(screen.getByTestId('resize-handle').dataset.size).toBe(String(expected));
    await waitFor(() => expect(window.localStorage.getItem(storageKey)).toBe(String(expected)));
  });

  it('starts a bottom-panel drag from its responsive rendered height, not its larger stored preference', async () => {
    const paneId = 'responsive-bottom-panel';
    const storageKey = `pane:${paneId}:size`;
    window.localStorage.setItem(storageKey, '700');

    render(<Harness paneId={paneId} options={options} renderedSize={300} />);
    const handle = screen.getByTestId('resize-handle');
    expect(handle.dataset.size).toBe('700');

    // Moving a bottom panel's top edge 50px upward grows the visible 300px panel to 350px.
    // If the hook incorrectly started from the stored preference this would jump to 750px.
    // The release flushes the final value regardless of the animation-frame queue.
    fireEvent.mouseDown(handle, { clientY: 500 });
    pointerMove(450);
    pointerUp();

    await waitFor(() => expect(handle.dataset.size).toBe('350'));
    expect(window.localStorage.getItem(storageKey)).toBe('350');
  });

  it('applies drag movement through the animation-frame batch, before the pointer is released', () => {
    // The path an actual drag uses: every pointermove within a frame only records the latest
    // position, and ONE queued animation-frame callback commits it. An earlier version of this
    // spec stubbed requestAnimationFrame to a no-op, so this path never ran and only the
    // release-time flush above was covered. Jest's modern fake timers drive the frame.
    jest.useFakeTimers();
    try {
      render(<Harness paneId="raf-batch" options={options} />);
      const handle = screen.getByTestId('resize-handle');

      fireEvent.mouseDown(handle, { clientY: 500 });
      pointerMove(470);
      pointerMove(450);
      // Batched: nothing is applied until the frame fires.
      expect(handle.dataset.size).toBe('400');

      act(() => {
        // Modern fake timers intercept requestAnimationFrame and run its callbacks on a 16 ms
        // cadence (jest 29 has no advanceTimersToNextFrame yet).
        jest.advanceTimersByTime(16);
      });

      // The one frame applies the LATEST move (up 50px grows the bottom pane to 450), not one
      // update per move - and the mid-drag value is already persisted.
      expect(handle.dataset.size).toBe('450');
      expect(window.localStorage.getItem('pane:raf-batch:size')).toBe('450');
    } finally {
      act(() => {
        pointerUp();
      });
      jest.useRealTimers();
    }
  });

  describe('keyboard resize', () => {
    it('one step per press, with the splitter direction mapped to what it does to the pane', () => {
      render(<Harness paneId="kb-bottom" options={options} />);
      const handle = screen.getByTestId('resize-handle');
      expect(handle.dataset.size).toBe('400');

      // A bottom pane's splitter is its TOP edge: moving it toward-start (up) makes the pane taller.
      fireEvent.click(screen.getByTestId('kb-toward-start'));
      expect(handle.dataset.size).toBe('416');

      fireEvent.click(screen.getByTestId('kb-toward-end'));
      expect(handle.dataset.size).toBe('400');
      expect(window.localStorage.getItem('pane:kb-bottom:size')).toBe('400');
    });

    it('reverses for a left pane, whose splitter moves toward-end to grow it', () => {
      render(<Harness paneId="kb-left" options={{ defaultSize: 400, minSize: 100, maxSize: 800, side: 'left' }} />);

      fireEvent.click(screen.getByTestId('kb-toward-end'));
      expect(screen.getByTestId('resize-handle').dataset.size).toBe('416');
    });

    it('Home/End land on the bounds, and steps clamp there', () => {
      render(<Harness paneId="kb-bounds" options={options} />);
      const handle = screen.getByTestId('resize-handle');

      fireEvent.click(screen.getByTestId('kb-max'));
      expect(handle.dataset.size).toBe('800');
      // Growing past the maximum stays at the maximum.
      fireEvent.click(screen.getByTestId('kb-toward-start'));
      expect(handle.dataset.size).toBe('800');

      fireEvent.click(screen.getByTestId('kb-min'));
      expect(handle.dataset.size).toBe('100');
      // Shrinking past the minimum stays at the minimum.
      fireEvent.click(screen.getByTestId('kb-toward-end'));
      expect(handle.dataset.size).toBe('100');
    });
  });

  /**
   * A viewport SMALLER than the display the preference was saved on. Both consumer-session panes
   * are capped responsively - Tools to 85% of the viewport height, the message inspector to 85% of
   * its width - so the pane the user can see is smaller than the stored number while the
   * preference itself is deliberately kept.
   *
   * The pointer path already begins from the measured pane. The keyboard half is the same control
   * and must behave the same way: an arrow moves the splitter from where it IS. Walking a stale
   * 700 down toward a 300px pane instead means the first ~25 presses move nothing on screen, and
   * the value announced to assistive tech describes a pane that is not there.
   *
   * Driven through the real handle, because the measurement is the handle's half of the job.
   */
  describe('a pane capped below its stored preference', () => {
    const stubbedRect = (size: number) => (el: HTMLDivElement | null) => {
      if (el !== null) {
        // jsdom lays nothing out; this is the responsive cap the browser would report.
        el.getBoundingClientRect = () => ({ height: size, width: size } as DOMRect);
      }
    };

    function ResponsiveHarness({ renderedSize }: { renderedSize: number }) {
      const pane = useResizablePane('responsive-keyboard', options);

      return (
        <div ref={stubbedRect(renderedSize)} data-testid="pane">
          <PaneResizeHandle testId="handle" resizeAxis="vertical" onResizeStart={pane.startResize} pane={pane} />
          <span data-testid="size">{pane.size}</span>
        </div>
      );
    }

    const renderResponsive = (storedSize: string, renderedSize: number) => {
      window.localStorage.setItem('pane:responsive-keyboard:size', storedSize);
      render(<ResponsiveHarness renderedSize={renderedSize} />);
      return { handle: screen.getByTestId('handle'), size: () => screen.getByTestId('size').textContent };
    };

    it('an arrow moves the splitter from the pane on SCREEN, not from the stored preference', () => {
      const { handle, size } = renderResponsive('700', 300);

      // A bottom pane's splitter is its top edge: ArrowUp grows it, by one step from the 300 it
      // actually occupies. Starting from the stored 700 would set 716 and change nothing visible.
      fireEvent.keyDown(handle, { key: 'ArrowUp' });
      expect(size()).toBe('316');

      // ...and shrinking is immediate for the same reason - it does not have to walk 700 down first.
      fireEvent.keyDown(handle, { key: 'ArrowDown' });
      expect(size()).toBe('284');
    });

    it('announces the size the pane really has', () => {
      const { handle } = renderResponsive('700', 300);

      act(() => handle.focus());

      // aria-valuenow describes the separator's position, so it must be the measured pane; the
      // bounds stay the ones a drag or an arrow can actually reach.
      expect(handle.getAttribute('aria-valuenow')).toBe('300');
      expect(handle.getAttribute('aria-valuemin')).toBe('100');
      expect(handle.getAttribute('aria-valuemax')).toBe('800');
    });
  });
});
