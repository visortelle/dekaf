/**
 * @jest-environment jsdom
 *
 * BUG-2 regression: the "As JSON" editor's onChange must apply edits (it previously wired
 * `onChange={() => props.mode === 'edit' ? onChange : () => {}}` - the argument was discarded and a
 * function was passed instead of applying the value), and readonly mode must suppress edits.
 *
 * JsonView renders Monaco (unavailable in jsdom), so it is mocked to a button that fires its
 * onChange with a fixed value - exactly the wiring KeyValueEditor is responsible for.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KeyValueEditor from './KeyValueEditor';

type Kv = { key: string; value: string }[];
const EDIT: Kv = [{ key: 'edited', value: 'v' }];

jest.mock('../JsonView/JsonView', () => ({
  __esModule: true,
  default: (props: { onChange?: (v: Kv) => void; readonly?: boolean }) => (
    <button
      data-testid="mock-jsonview-fire"
      data-readonly={String(Boolean(props.readonly))}
      onClick={() => props.onChange && props.onChange(EDIT)}
    >
      fire
    </button>
  ),
}));

function renderInJsonView(mode: 'edit' | 'readonly', onChange: (v: Kv) => void) {
  render(<KeyValueEditor value={[{ key: 'k', value: 'v' }]} mode={mode} onChange={onChange} testId="t" />);
  // Toggle from list to JSON view.
  fireEvent.click(screen.getByTestId('key-value-display-changer-t'));
}

describe('BUG-2: KeyValueEditor As-JSON wiring', () => {
  it('applies JSON edits to onChange in edit mode', () => {
    const onChange = jest.fn();
    renderInJsonView('edit', onChange);
    fireEvent.click(screen.getByTestId('mock-jsonview-fire'));
    expect(onChange).toHaveBeenCalledWith(EDIT);
  });

  it('suppresses edits and marks JsonView readonly in readonly mode', () => {
    const onChange = jest.fn();
    renderInJsonView('readonly', onChange);
    expect(screen.getByTestId('mock-jsonview-fire').getAttribute('data-readonly')).toBe('true');
    fireEvent.click(screen.getByTestId('mock-jsonview-fire'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
