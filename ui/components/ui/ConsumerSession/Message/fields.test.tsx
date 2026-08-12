/**
 * @jest-environment jsdom
 *
 * Regression: ValueField shortens a long message value to 100 chars for display, but it also
 * passed that shortened string as `rawValue` - and `rawValue` is exactly what Field puts on the
 * clipboard on click (and into the `title` tooltip). So copying a long value handed the user the
 * ellipsised display text instead of the payload.
 *
 * CS-25 (e2e) clicks a value cell but its fixture value is short, so it cannot discriminate.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValueField } from './fields';
import { genEmptyMessageDescriptor } from '../testing';

const clipboardWrites: string[] = [];

beforeAll(() => {
  // jsdom implements neither of these; Field's copy helper needs both to take the modern path.
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        clipboardWrites.push(text);
        return Promise.resolve();
      },
    },
  });
});

beforeEach(() => {
  clipboardWrites.length = 0;
});

function renderValue(value: string) {
  render(<ValueField isShowTooltips={false} message={genEmptyMessageDescriptor({ value })} />);
  return screen.getByTestId('cs-cell-value');
}

describe('ValueField copies the whole value, not the truncated display', () => {
  const longValue = `"${'x'.repeat(400)}"`; // 402 chars - well past the 100 char display limit

  it('shortens the displayed text', () => {
    expect(renderValue(longValue).textContent).toBe(`${longValue.slice(0, 100)}...`);
  });

  it('copies the complete value on click', async () => {
    fireEvent.click(renderValue(longValue));
    await waitFor(() => expect(clipboardWrites).toEqual([longValue]));
  });

  it('exposes the complete value as the cell title', () => {
    expect(renderValue(longValue).getAttribute('title')).toBe(longValue);
  });

  it('leaves a short value untouched in both the display and the clipboard', async () => {
    const shortValue = '"msg-1"';
    const cell = renderValue(shortValue);
    expect(cell.textContent).toBe(shortValue);
    fireEvent.click(cell);
    await waitFor(() => expect(clipboardWrites).toEqual([shortValue]));
  });

  it('exposes the copy action to the keyboard as well as the mouse', async () => {
    const value = 'keyboard-copy';
    const cell = renderValue(value);

    expect(cell.getAttribute('role')).toBe('button');
    expect(cell.getAttribute('tabindex')).toBe('0');
    expect(cell.getAttribute('aria-label')).toBe('Copy Value');

    fireEvent.keyDown(cell, { key: 'Enter' });
    fireEvent.keyDown(cell, { key: ' ' });
    await waitFor(() => expect(clipboardWrites).toEqual([value, value]));
  });
});
