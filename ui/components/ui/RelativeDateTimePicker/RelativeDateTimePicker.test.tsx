/**
 * @jest-environment jsdom
 *
 * "n <unit> ago", and what the number is allowed to be.
 *
 * The field used to commit `Number(v)` after every keystroke, and `Number` answers something for
 * nearly anything. Each of those answers is a different INSTANT, chosen silently:
 *
 * - `Number('')` is 0, so clearing the field to retype it means "now" - not "unset";
 * - a negative is a FUTURE instant, under a label that says "ago", and the server subtracts it
 *   without complaint;
 * - a fraction and anything past 2,147,483,647 are coerced on the way through protobuf's int32,
 *   so the value that travels is not the value on screen (2147483648 arrives as -2147483648, i.e.
 *   an instant roughly 68 years in the FUTURE for `year`).
 *
 * None of those are refusals, so none of them are visible - the session simply starts somewhere
 * else. The picker is not reachable from Playwright with a bad value either (a `type=number` field
 * silently drops what it cannot parse), which is why this lives here.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RelativeDateTimePicker from './RelativeDateTimePicker';
import { relativeDateTimeValueMax } from './relative-date-time';
import { RelativeDateTime } from '../ConsumerSession/types';

const relativeDateTime = (value: number): RelativeDateTime => ({ value, unit: 'hour', isRoundedToUnitStart: false });

/** The picker with a parent that applies what it is handed, as the real editor does. */
const renderPicker = (initial: RelativeDateTime = relativeDateTime(3), isReadOnly = false) => {
  const onChange = jest.fn();
  const Controlled = () => {
    const [value, setValue] = React.useState(initial);
    return (
      <RelativeDateTimePicker
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        isReadOnly={isReadOnly}
      />
    );
  };

  render(<Controlled />);
  return onChange;
};

const valueInput = () => screen.getByTestId('relative-date-time-value') as HTMLInputElement;
const error = () => screen.queryByTestId('relative-date-time-value-error');
const lastValue = (onChange: jest.Mock) => onChange.mock.calls[onChange.mock.calls.length - 1][0];

describe('the "how long ago" number', () => {
  it('commits a whole number of units', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '12' } });

    expect(error()).toBeNull();
    expect(lastValue(onChange)).toEqual({ value: 12, unit: 'hour', isRoundedToUnitStart: false });
  });

  it('accepts zero - "0 hours ago" is now, which is a position like any other', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '0' } });

    expect(error()).toBeNull();
    expect(lastValue(onChange).value).toBe(0);
  });

  it('refuses an emptied field rather than quietly meaning "now"', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses a negative, which would be a FUTURE instant under a label that says "ago"', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '-5' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses a fraction instead of letting the wire round it', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '1.5' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses an exponent instead of reading part of it', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '1e3' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts the largest value the int32 model can carry', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: String(relativeDateTimeValueMax) } });

    expect(error()).toBeNull();
    expect(lastValue(onChange).value).toBe(relativeDateTimeValueMax);
    expect(relativeDateTimeValueMax).toBe(2147483647);
  });

  it('refuses one past it, which the int32 wire turns into a future instant', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: String(relativeDateTimeValueMax + 1) } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the refused text on screen so it can be corrected, and recovers', () => {
    const onChange = renderPicker();

    fireEvent.change(valueInput(), { target: { value: '-5' } });
    expect(valueInput().value).toBe('-5');

    fireEvent.change(valueInput(), { target: { value: '7' } });

    expect(error()).toBeNull();
    expect(lastValue(onChange).value).toBe(7);
  });

  it('says which value is still in effect while the entry is refused', () => {
    // The refused entry does not undo the last valid one, so Play starts from THAT.
    renderPicker(relativeDateTime(3));

    fireEvent.change(valueInput(), { target: { value: '-5' } });

    expect(error()?.textContent).toMatch(/\b3\b/);
  });

  it('leaves the other fields of the value alone when the number is edited', () => {
    const onChange = renderPicker({ value: 3, unit: 'week', isRoundedToUnitStart: true });

    fireEvent.change(valueInput(), { target: { value: '9' } });

    expect(lastValue(onChange)).toEqual({ value: 9, unit: 'week', isRoundedToUnitStart: true });
  });
});

describe('a read-only relative time', () => {
  it('does not let the number be edited', () => {
    renderPicker(relativeDateTime(3), true);

    expect(valueInput().disabled).toBe(true);
  });
});
