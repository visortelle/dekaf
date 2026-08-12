/**
 * @jest-environment jsdom
 *
 * The regex `m` and `i` flags are addons on the shared Input, and an addon is a plain div with an
 * `onClick` - so `disabled` on the field does nothing for them. In a read-only (library-owned)
 * filter, one click used to rewrite the stored pattern's flags: the same regex, matching a
 * different set of messages.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TestOpStringMatchesRegexInput from './TestOpStringMatchesRegexInput';

const renderOp = (isReadOnly: boolean, flags = '') => {
  const onChange = jest.fn();
  render(
    <TestOpStringMatchesRegexInput
      value={{ type: 'string-matches-regex', pattern: 'a.*b', flags } as never}
      onChange={onChange}
      isReadOnly={isReadOnly}
    />
  );
  return onChange;
};

describe('a read-only regex filter', () => {
  it.each([['m'], ['i']])('does not let the %s flag be toggled', (flag) => {
    const onChange = renderOp(true);

    fireEvent.click(screen.getByText(flag));

    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([['m'], ['i']])('still lets the %s flag be toggled when the filter is editable', (flag) => {
    const onChange = renderOp(false);

    fireEvent.click(screen.getByText(flag));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].flags).toContain(flag);
  });

  it('still shows which flags are set', () => {
    // Read-only means "cannot change it", not "cannot see it".
    renderOp(true, 'mi');

    expect(screen.getByText('m')).toBeTruthy();
    expect(screen.getByText('i')).toBeTruthy();
  });
});
