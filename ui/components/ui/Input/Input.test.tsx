/**
 * @jest-environment jsdom
 *
 * The shared text/number field, and specifically WHO WINS when two different things have an opinion
 * about whether it is editable.
 *
 * `isReadOnly` is how the whole app renders a referenced (library-owned) configuration: the value on
 * screen belongs to a stored item and must not be edited in place. Callers independently pass
 * `inputProps` to forward native attributes such as `min`/`max`/`step`, and a caller that also
 * mentions `disabled` there - even as `undefined`, which is what `inputProps={{ disabled:
 * props.disabled }}` produces on a component with no `disabled` prop - must not be able to hand the
 * field back to the user.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

const renderInput = (props: Record<string, unknown>) => {
  const onChange = jest.fn();
  render(<Input testId="the-input" value="5" onChange={onChange} {...(props as Record<string, never>)} />);
  return { onChange, input: () => screen.getByTestId('the-input') as HTMLInputElement };
};

describe('a read-only Input', () => {
  it('stays disabled when a caller passes inputProps without a disabled of its own', () => {
    // `{ disabled: props.disabled, min: 0 }` with no `disabled` prop set - the exact shape the
    // start-from number fields pass.
    const { input } = renderInput({ isReadOnly: true, inputProps: { disabled: undefined, min: 0 } });

    expect(input().disabled).toBe(true);
  });

  it('stays disabled when a caller explicitly passes disabled: false', () => {
    const { input } = renderInput({ isReadOnly: true, inputProps: { disabled: false } });

    expect(input().disabled).toBe(true);
  });

  it('refuses real typing, not merely styling', async () => {
    // userEvent, not fireEvent: fireEvent dispatches the change event straight at the element and
    // would "type" into a disabled field that no browser would accept.
    const { onChange, input } = renderInput({ isReadOnly: true, inputProps: { disabled: undefined } });

    await userEvent.type(input(), '9');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('still honours a caller that disables the field on its own', () => {
    const { input } = renderInput({ inputProps: { disabled: true } });

    expect(input().disabled).toBe(true);
  });

  it('leaves an ordinary field editable', () => {
    const { onChange, input } = renderInput({ inputProps: { disabled: undefined, min: 0 } });

    expect(input().disabled).toBe(false);
    fireEvent.change(input(), { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith('9');
  });

  it('still forwards the other native attributes it was given', () => {
    // The spread has to keep working - `min`/`max`/`step` are what the number fields rely on.
    const { input } = renderInput({ inputProps: { min: 0, max: 100, step: 'any' } });

    expect(input().getAttribute('min')).toBe('0');
    expect(input().getAttribute('max')).toBe('100');
    expect(input().getAttribute('step')).toBe('any');
  });
});

/**
 * `disabled` on the native `<input>` stops TYPING and nothing else. This component ships two other
 * controls of its own, and both mutate:
 *
 * - the addons, which are how the regex `m`/`i` flags and the match-case switch are toggled - they
 *   change the value the filter is evaluated with, not merely how it is displayed;
 * - the clear button, which sets the value to `''`.
 *
 * Neither is a `<button>`, so neither inherits anything from the field being disabled: they are
 * plain divs with an `onClick`, live in every read-only render, and a click on one edits a
 * configuration the user is only supposed to be looking at.
 */
describe('a read-only Input still has controls that mutate', () => {
  const addon = (onClick: () => void) => ({
    id: 'the-addon',
    isEnabled: false,
    onClick,
    label: 'm',
  });

  const renderWithAddon = (props: Record<string, unknown>) => {
    const onAddonClick = jest.fn();
    const onChange = jest.fn();
    render(
      <Input
        testId="the-input"
        value="5"
        onChange={onChange}
        addons={[addon(onAddonClick)]}
        {...(props as Record<string, never>)}
      />
    );
    // The addon is a div, not a role - the label is all it has.
    return { onAddonClick, onChange, addonEl: () => screen.getByText('m') };
  };

  it('does not toggle an addon when it is read-only', () => {
    const { onAddonClick, addonEl } = renderWithAddon({ isReadOnly: true });

    fireEvent.click(addonEl());

    expect(onAddonClick).not.toHaveBeenCalled();
  });

  it('still toggles an addon when it is editable', () => {
    // The counterpart: "never toggles" is otherwise satisfiable by never toggling at all.
    const { onAddonClick, addonEl } = renderWithAddon({});

    fireEvent.click(addonEl());

    expect(onAddonClick).toHaveBeenCalledTimes(1);
  });

  it('keeps showing what the addon state IS, since that is part of the value', () => {
    // Suppressing the mutation must not hide the setting: a reader of a stored filter needs to see
    // that it is case-insensitive.
    render(
      <Input
        testId="the-input"
        value="5"
        onChange={() => undefined}
        addons={[{ id: 'a', isEnabled: true, onClick: () => undefined, label: 'i' }]}
        isReadOnly
      />
    );

    expect(screen.getByText('i')).toBeTruthy();
  });

  it('does not offer to clear the value when it is read-only', () => {
    const onChange = jest.fn();
    const { container } = render(
      <Input testId="the-input" value="5" onChange={onChange} clearable isReadOnly />
    );

    // Whatever remains on screen, nothing there may empty the field.
    Array.from(container.querySelectorAll('div')).forEach((el) => fireEvent.click(el));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('still clears the value when it is editable', () => {
    const onChange = jest.fn();
    const { container } = render(<Input testId="the-input" value="5" onChange={onChange} clearable />);

    Array.from(container.querySelectorAll('div')).forEach((el) => fireEvent.click(el));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
