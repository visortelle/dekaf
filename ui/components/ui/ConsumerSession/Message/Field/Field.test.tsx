/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * What the copy toast CALLS the value it just copied.
 *
 * The default names the column ("<title> value copied"), which reads correctly while the column
 * title names a field. It stopped reading correctly once the same Field was reused for Topic
 * Positions, whose topic column is headed "Topic / partition" - a heading, not a thing you can
 * hold, so the toast said "Topic / partition value copied to clipboard." `copyLabel` is the
 * override for exactly that case, and these two tests are what keep the default from quietly
 * coming back for it.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Field from './Field';
import { defaultValue as notifications } from '../../../../app/contexts/Notifications';
import { copyToClipboard } from '../../../../app/clipboard';

// The module's exports are not configurable, so the module - not the binding - is what gets mocked.
jest.mock('../../../../app/clipboard', () => ({
  copyToClipboard: jest.fn(),
  copyFailureMessage: () => 'copy failed',
}));

const renderField = (props: { title?: string; copyLabel?: string }) =>
  render(
    <Field
      title={props.title}
      copyLabel={props.copyLabel}
      value="persistent://t/ns/orders"
      rawValue="persistent://t/ns/orders"
      tooltip={undefined}
      isShowTooltips={false}
      testId="field-under-test"
    />
  );

describe('the copy-to-clipboard toast', () => {
  let reported: string[] = [];

  beforeEach(() => {
    reported = [];
    (copyToClipboard as jest.Mock).mockResolvedValue(true);
    jest.spyOn(notifications, 'notifySuccess').mockImplementation((content) => {
      reported.push(String(content));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  it('names the column by default - correct wherever the title names a field', async () => {
    renderField({ title: 'Publish time' });

    fireEvent.click(screen.getByTestId('field-under-test'));
    await Promise.resolve();

    expect(reported).toEqual(['Publish time value copied to clipboard.']);
  });

  it('uses copyLabel when the column HEADING would not read as a thing you can hold', async () => {
    // Topic Positions' topic column: headed "Topic / partition", but one FQN lands on the
    // clipboard - so the toast names that, and never says "Topic / partition value".
    renderField({ title: 'Topic / partition', copyLabel: 'Topic FQN' });

    fireEvent.click(screen.getByTestId('field-under-test'));
    await Promise.resolve();

    expect(reported).toEqual(['Topic FQN copied to clipboard.']);
    expect(reported[0]).not.toContain('Topic / partition');
  });
});
