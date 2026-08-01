/**
 * @jest-environment jsdom
 *
 * Match-case is an addon on the shared Input, and an addon is a plain div with an `onClick` - so
 * `disabled` on the field does nothing for it. In a read-only (library-owned) configuration, a
 * click on it used to flip the stored item's matching behaviour: same text, different matches.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StringFilterInput from './StringFilterInput';

const renderFilter = (isReadOnly: boolean) => {
  const onIsMatchCaseChange = jest.fn();
  const onChange = jest.fn();
  const { container } = render(
    <StringFilterInput
      testId="the-filter"
      value="abc"
      onChange={onChange}
      isMatchCase={false}
      onIsMatchCaseChange={onIsMatchCaseChange}
      isReadOnly={isReadOnly}
    />
  );

  // The match-case addon carries an icon rather than a label, and both the CSS module class names
  // and the icon itself are stubbed under jest - so it is identified by being a clickable thing in
  // this field rather than by a selector that jest cannot see. Clicking everything also answers the
  // stronger question: is there ANY affordance here that mutates?
  const clickEverything = () => Array.from(container.querySelectorAll('div')).forEach((el) => fireEvent.click(el));

  return { onIsMatchCaseChange, onChange, clickEverything };
};

describe('match case in a read-only string filter', () => {
  it('cannot be toggled', () => {
    const { onIsMatchCaseChange, clickEverything } = renderFilter(true);

    clickEverything();

    expect(onIsMatchCaseChange).not.toHaveBeenCalled();
  });

  it('can be toggled when the filter is editable', () => {
    const { onIsMatchCaseChange, clickEverything } = renderFilter(false);

    clickEverything();

    expect(onIsMatchCaseChange).toHaveBeenCalledWith(true);
  });

  it('leaves the text field unusable too', () => {
    renderFilter(true);

    expect((screen.getByTestId('the-filter') as HTMLInputElement).disabled).toBe(true);
  });
});
