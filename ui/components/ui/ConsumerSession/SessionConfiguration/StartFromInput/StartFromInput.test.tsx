/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The two approximate start-from modes - "About % through the data" and "About % through the time
 * range" - their selector branches, and the percent control each one edits.
 *
 * The percent control is the piece Playwright can drive but cannot judge: the model stores a
 * FRACTION in [0, 1] while the user edits a PERCENT in [0, 100], so every keystroke crosses a
 * conversion, and an out-of-range percent must be refused BEFORE it reaches the model (the server
 * rejects a fraction outside [0.0, 1.0] outright).
 *
 * Both modes render the SAME control with different test ids, so the per-mode suite below runs
 * twice. The ids are what keep them apart: a shared one would let a test drive the data control and
 * assert the time one without noticing.
 *
 * mermaid/nanoid are ESM-only and jest does not transform node_modules; both are pulled in far away
 * through the library browser panel that every managed-item editor renders.
 */
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import StartFromInput from './StartFromInput';
import { fractionFromPercent, percentFromFraction } from './approximate-fraction';
import { latestMessageCountMax } from './message-count';

const libraryContext = {
  pulsarResource: {
    type: 'topic' as const,
    tenant: 'public',
    namespace: 'default',
    topicPersistency: 'persistent' as const,
    topic: 'a-topic',
  },
};

const startFromItem = (startFrom: unknown) => ({
  type: 'value' as const,
  val: {
    metadata: { id: 'sf-1', name: '', descriptionMarkdown: '', type: 'consumer-session-start-from' as const },
    spec: { startFrom },
  },
});

// The same SWR settings the app installs - without them the data hooks in the library panel keep a
// retry timer alive past the jsdom teardown.
const renderInput = (startFrom: unknown, targetTopicsPersistency?: { hasPersistent: boolean; hasNonPersistent: boolean }) => {
  const onChange = jest.fn();
  render(
    <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
      <StartFromInput
        value={startFromItem(startFrom) as never}
        onChange={onChange}
        libraryContext={libraryContext}
        targetTopicsPersistency={targetTopicsPersistency}
      />
    </SWRConfig>
  );
  return onChange;
};

/** The same editor as it renders a REFERENCED library item: shown, never edited in place. */
const renderReadOnly = (startFrom: unknown) => {
  render(
    <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
      <StartFromInput
        value={startFromItem(startFrom) as never}
        onChange={() => undefined}
        libraryContext={libraryContext}
        isReadOnly
      />
    </SWRConfig>
  );
};

/**
 * Same component, but with a parent that actually applies what it is handed - which is what the app
 * does. Anything about how the control reacts to its own committed value needs this: with an inert
 * `onChange` the props never move, so half the behaviour never runs.
 */
const renderControlled = (startFrom: unknown) => {
  const onChange = jest.fn();
  const Controlled = () => {
    const [value, setValue] = React.useState<unknown>(() => startFromItem(startFrom));
    return (
      <StartFromInput
        value={value as never}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        libraryContext={libraryContext}
      />
    );
  };

  render(
    <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
      <Controlled />
    </SWRConfig>
  );
  return onChange;
};

const nonPersistentOnly = { hasPersistent: false, hasNonPersistent: true };
const mixed = { hasPersistent: true, hasNonPersistent: true };

/** The start-from modes offered by the selector, mapped to whether the option is selectable. */
const modeOptions = () =>
  Array.from(screen.getByTestId('cs-start-from').querySelectorAll('option')).reduce<Record<string, boolean>>(
    (acc, o) => ({ ...acc, [o.value]: !o.disabled }),
    {}
  );

/** The start-from the component handed back to its parent on the last onChange. */
const lastStartFrom = (onChange: jest.Mock) => onChange.mock.calls[onChange.mock.calls.length - 1][0].val.spec.startFrom;

describe('percent <-> fraction', () => {
  it('renders a fraction as a clean percent, without binary-float debris', () => {
    // In IEEE-754 `0.07 * 100` is 7.000000000000001 and `0.29 * 100` is 28.999999999999996.
    // Putting either of those in a form field would be absurd.
    expect(percentFromFraction(0.07)).toBe('7');
    expect(percentFromFraction(0.29)).toBe('29');
    expect(percentFromFraction(0)).toBe('0');
    expect(percentFromFraction(1)).toBe('100');
    expect(percentFromFraction(0.605)).toBe('60.5');
  });

  it('accepts a valid percent and converts it back to a fraction', () => {
    expect(fractionFromPercent('0')).toBe(0);
    expect(fractionFromPercent('60')).toBe(0.6);
    expect(fractionFromPercent('100')).toBe(1);
    expect(fractionFromPercent('12.5')).toBe(0.125);
  });

  it('rejects out-of-range percents - the server refuses a fraction outside [0.0, 1.0]', () => {
    expect(fractionFromPercent('-1')).toBeUndefined();
    expect(fractionFromPercent('101')).toBeUndefined();
    expect(fractionFromPercent('1000')).toBeUndefined();
  });

  it('rejects non-numeric input rather than turning it into NaN', () => {
    expect(fractionFromPercent('')).toBeUndefined();
    expect(fractionFromPercent('   ')).toBeUndefined();
    expect(fractionFromPercent('abc')).toBeUndefined();
    expect(fractionFromPercent('50%')).toBeUndefined();
    expect(fractionFromPercent('1e2')).toBeUndefined();
    expect(fractionFromPercent('0x10')).toBeUndefined();
  });
});

describe('the start-from mode selector', () => {
  it('offers both approximate modes alongside the pre-existing ones', () => {
    renderInput({ type: 'latestMessage' });

    const values = Array.from(screen.getByTestId('cs-start-from').querySelectorAll('option')).map((o) => o.value);
    expect(values).toContain('approximateDataPosition');
    expect(values).toContain('approximateTimePosition');
    // The seven pre-existing modes must survive the addition.
    expect(values).toEqual(
      expect.arrayContaining([
        'earliestMessage',
        'latestMessage',
        'messageId',
        'dateTime',
        'relativeDateTime',
        'nthMessageAfterEarliest',
        'nthMessageBeforeLatest',
      ])
    );
  });

  it('labels the two approximate modes by what the percentage is OF', () => {
    // The labels are the whole point of the split: "Approximate position" meant either of these and
    // could not say which. They are also what the e2e specs select by.
    renderInput({ type: 'latestMessage' });

    const byValue = Object.fromEntries(
      Array.from(screen.getByTestId('cs-start-from').querySelectorAll('option')).map((o) => [o.value, o.textContent])
    );
    expect(byValue.approximateDataPosition).toBe('About % through the data');
    expect(byValue.approximateTimePosition).toBe('About % through the time range');
  });

  it.each([
    ['approximateDataPosition'],
    ['approximateTimePosition'],
  ])('builds a %s spec when the mode is picked', (mode) => {
    const onChange = renderInput({ type: 'latestMessage' });

    fireEvent.change(screen.getByTestId('cs-start-from'), { target: { value: mode } });

    // A silently-ignored branch would leave the spec untouched; a missing branch would leave
    // onChange uncalled entirely. The two share one switch, so each needs its own case.
    expect(onChange).toHaveBeenCalled();
    expect(lastStartFrom(onChange)).toEqual({ type: mode, fraction: 0.5 });
  });

  it('still builds the skip-n spec, which shares the same switch', () => {
    const onChange = renderInput({ type: 'latestMessage' });

    fireEvent.change(screen.getByTestId('cs-start-from'), { target: { value: 'nthMessageAfterEarliest' } });

    expect(lastStartFrom(onChange)).toEqual({ type: 'nthMessageAfterEarliest', n: 5 });
  });
});

/** The two modes and the test-id prefix each one's controls carry. */
const approximateModes = [
  ['approximateDataPosition', 'cs-start-from-data'],
  ['approximateTimePosition', 'cs-start-from-time'],
] as const;

describe.each(approximateModes)('the percent control for %s', (mode, prefix) => {
  const fractionInput = () => screen.getByTestId(`${prefix}-fraction`);
  const slider = () => screen.getByTestId(`${prefix}-fraction-slider`);
  const error = () => screen.queryByTestId(`${prefix}-fraction-error`);

  it('shows the stored fraction as a percent in both the number input and the slider', () => {
    renderInput({ type: mode, fraction: 0.6 });

    expect((fractionInput() as HTMLInputElement).value).toBe('60');
    expect((slider() as HTMLInputElement).value).toBe('60');
    expect(error()).toBeNull();
  });

  it('commits a typed percent as a fraction', () => {
    const onChange = renderInput({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '40' } });

    expect(lastStartFrom(onChange)).toEqual({ type: mode, fraction: 0.4 });
  });

  it('commits a slider move as a fraction', () => {
    const onChange = renderInput({ type: mode, fraction: 0.6 });

    fireEvent.change(slider(), { target: { value: '25' } });

    expect(lastStartFrom(onChange)).toEqual({ type: mode, fraction: 0.25 });
  });

  it('refuses a percent above 100 and says so, instead of sending a fraction the server rejects', () => {
    const onChange = renderInput({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '150' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    // The refused text stays visible so the user can correct it.
    expect((fractionInput() as HTMLInputElement).value).toBe('150');
  });

  it('refuses a negative percent', () => {
    const onChange = renderInput({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '-5' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses an emptied field rather than committing NaN', () => {
    const onChange = renderInput({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('recovers once the value is corrected', () => {
    const onChange = renderInput({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '150' } });
    fireEvent.change(fractionInput(), { target: { value: '15' } });

    expect(error()).toBeNull();
    expect(lastStartFrom(onChange)).toEqual({ type: mode, fraction: 0.15 });
  });

  it('is not rendered for the other modes', () => {
    renderInput({ type: 'nthMessageAfterEarliest', n: 5 });

    expect(screen.queryByTestId(`${prefix}-fraction`)).toBeNull();
    expect(screen.queryByTestId(`${prefix}-note`)).toBeNull();
    expect(screen.getByTestId('cs-start-from-n')).toBeTruthy();
  });

  it('does not rewrite what the user typed just because the model rounded it', () => {
    // The stored fraction keeps 6 decimals, so "12.34567" commits 0.123457 - which renders back as
    // "12.3457". Re-deriving the field from the model would edit the text from under the user
    // mid-entry; the field is only re-derived when the model means something ELSE.
    const onChange = renderControlled({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '12.34567' } });

    expect((fractionInput() as HTMLInputElement).value).toBe('12.34567');
    expect(lastStartFrom(onChange)).toEqual({ type: mode, fraction: 0.123457 });
  });

  it('says which percentage is still in effect while the entry is refused', () => {
    // The refused entry does not undo the last valid one, so Play starts from THAT - 60%, while the
    // box shows 150 and an error. Either the control blocks Play or it says what will happen; it
    // must not do neither.
    renderControlled({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '150' } });

    expect(error()?.textContent).toMatch(/60\s*%/);
  });

  it('adopts a value changed elsewhere, discarding a rejected entry', () => {
    const onChange = renderControlled({ type: mode, fraction: 0.6 });

    fireEvent.change(fractionInput(), { target: { value: '150' } });
    expect(error()).toBeTruthy();

    fireEvent.change(slider(), { target: { value: '30' } });

    expect((fractionInput() as HTMLInputElement).value).toBe('30');
    expect(error()).toBeNull();
    expect(lastStartFrom(onChange)).toEqual({ type: mode, fraction: 0.3 });
  });
});

describe('the two percent controls are not the same control', () => {
  // They render identically and store the same shape, so the ONLY thing keeping them apart in the
  // DOM is the test-id prefix. If both instances shared one id, every per-mode test above would
  // still pass while a Playwright spec silently drove the wrong mode.
  it('renders only the data control for the data mode', () => {
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    expect(screen.getByTestId('cs-start-from-data-fraction')).toBeTruthy();
    expect(screen.getByTestId('cs-start-from-data-note')).toBeTruthy();
    expect(screen.queryByTestId('cs-start-from-time-fraction')).toBeNull();
    expect(screen.queryByTestId('cs-start-from-time-note')).toBeNull();
  });

  it('renders only the time control for the time mode', () => {
    renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    expect(screen.getByTestId('cs-start-from-time-fraction')).toBeTruthy();
    expect(screen.getByTestId('cs-start-from-time-note')).toBeTruthy();
    expect(screen.queryByTestId('cs-start-from-data-fraction')).toBeNull();
    expect(screen.queryByTestId('cs-start-from-data-note')).toBeNull();
  });

  it('keeps the mode when the percentage is edited, rather than falling back to the other one', () => {
    // The onChange handler rebuilds the whole start-from, so it has to re-state its own `type`.
    const onChange = renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    fireEvent.change(screen.getByTestId('cs-start-from-time-fraction'), { target: { value: '20' } });

    expect(lastStartFrom(onChange)).toEqual({ type: 'approximateTimePosition', fraction: 0.2 });
  });
});

/**
 * The data mode resolves PER PHYSICAL TOPIC and lands on an entry rather than on a message. Both are
 * deliberate and both are invisible from the control itself - a percentage box gives no hint that
 * "50%" means 50% of EACH log, nor that the jump is measured in batched entries. The explanation
 * under the control is the only place the user is told, so it is pinned here.
 */
describe('what the "% through the data" note tells the user', () => {
  const noteText = () => screen.getByTestId('cs-start-from-data-note').textContent ?? '';

  it('says each topic and each partition starts at its own position', () => {
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    const note = noteText();
    expect(note).toMatch(/partition/i);
    expect(note).toMatch(/each|every/i);
    expect(note).toMatch(/its own position|own position/i);
  });

  it('says the percentage is not of the topics combined', () => {
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    // Without this the reader can reasonably assume "50%" means 50% of one merged stream, which is
    // the position the session does NOT take.
    expect(noteText()).toMatch(/not of all of them|not of the (topics )?combined|rather than of all/i);
  });

  it('says the position is approximate, and why - entries are batches, so a % of entries is not that % of messages', () => {
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    const note = noteText();
    expect(note).toMatch(/approximate/i);
    expect(note).toMatch(/entries/i);
    expect(note).toMatch(/batch/i);
    expect(note).toMatch(/not exactly/i);
  });

  it('describes 100% as the server actually resolves it: past everything retained', () => {
    // 1.0 in this mode is MessageId.latest - the same position "Latest message" takes, showing
    // nothing that is retained and only what arrives from now on. Calling it "the newest message"
    // promises the last message in the topic, which is what the TIME mode's 100% gives; here it
    // delivers an apparently empty session, and the note was the only place to find out.
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    const note = noteText();
    expect(note).toMatch(/100%/);
    expect(note).toMatch(/from now on|only new messages|nothing that is still kept|past (the )?(newest|everything)/i);
    expect(note).not.toMatch(/100% is the\s+newest\b(?!.*from now)/i);
  });

  it('points at the time mode as the other reading of "half way in"', () => {
    // The two labels differ by three words, so the note is where a reader who picked the wrong one
    // finds out. Without it the modes are only distinguishable by guessing.
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    expect(noteText()).toMatch(/About % through the time range/);
  });

  it('stays in the reader\'s terms, not Pulsar internals', () => {
    renderInput({ type: 'approximateDataPosition', fraction: 0.6 });

    expect(noteText()).not.toMatch(/examineMessage|ordinal|brokerEntryMetadata|managed ?ledger/i);
  });
});

/**
 * The time mode's two surprises are the mirror image: the percentage is of ELAPSED TIME rather than
 * of messages, and a partitioned topic is pooled into ONE range instead of being positioned
 * partition by partition. Neither is visible from a percentage box either.
 */
describe('what the "% through the time range" note tells the user', () => {
  const noteText = () => screen.getByTestId('cs-start-from-time-note').textContent ?? '';

  it('says the percentage is of time, not of messages', () => {
    renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    const note = noteText();
    expect(note).toMatch(/time/i);
    expect(note).toMatch(/not messages|not of messages|rather than messages|measures time, not messages/i);
  });

  it('points at the data mode as the other reading of "half way in"', () => {
    renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    expect(noteText()).toMatch(/About % through the data/);
  });

  it('says a partitioned topic is treated as ONE range, unlike the data mode', () => {
    // This is the substantive difference between the two modes' scopes, and getting it wrong costs
    // the user a session pointed somewhere they did not ask for.
    renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    const note = noteText();
    expect(note).toMatch(/partition/i);
    expect(note).toMatch(/one topic|same moment|across every partition/i);
  });

  it('says the timestamp comes from the sending machine', () => {
    // publishTime is the producer's clock, so the position is only as good as that clock. Saying so
    // is the difference between "approximate" and "wrong".
    renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    const note = noteText();
    expect(note).toMatch(/approximate/i);
    expect(note).toMatch(/machine that sent|producer|sending machine/i);
  });

  it('stays in the reader\'s terms, not Pulsar internals', () => {
    renderInput({ type: 'approximateTimePosition', fraction: 0.6 });

    expect(noteText()).not.toMatch(/examineMessage|publishTime|ledger|epoch|millisecond/i);
  });
});

/**
 * "Skip first n messages" and "Latest n messages" both edit a COUNT OF MESSAGES: a whole number, at
 * least zero, that the server has to be able to act on. The field used to commit `parseInt` of
 * whatever was on screen after every keystroke, and `parseInt` answers something for nearly
 * anything - which is how a blank field became NaN, `min=0` became decoration, and `2.7`, `1e3` and
 * a number past 2^53 all became a different count than the one that was typed.
 */
const countModes = [
  ['nthMessageAfterEarliest'],
  ['nthMessageBeforeLatest'],
] as const;

describe.each(countModes)('the message-count field for %s', (mode) => {
  const countInput = () => screen.getByTestId('cs-start-from-n') as HTMLInputElement;
  const error = () => screen.queryByTestId('cs-start-from-n-error');

  it('commits a valid count', () => {
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '12' } });

    expect(lastStartFrom(onChange)).toEqual({ type: mode, n: 12 });
    expect(error()).toBeNull();
  });

  it('accepts zero - "skip nothing" and "the latest 0" are legal counts', () => {
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '0' } });

    expect(lastStartFrom(onChange)).toEqual({ type: mode, n: 0 });
  });

  it('refuses an emptied field rather than committing NaN', () => {
    // Clearing the field to retype it is the most ordinary thing a user does here, and `parseInt('')`
    // is NaN - which then serializes into the request as a count nobody asked for.
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses a negative count - `min=0` is advice to the browser, not a guard', () => {
    // Defence in depth: the UI refuses a negative here AND the server now refuses it at the trust
    // boundary (server startFromCountValidationTest). `min=0` is only advice to the browser, so this
    // client-side check still earns its place even though the server guards the same thing.
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '-1' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses a fractional count instead of silently truncating it', () => {
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '2.7' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses an exponent instead of reading only its mantissa', () => {
    // `parseInt('1e3')` is 1: a thousand becomes one, with nothing on screen to say so.
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '1e3' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses a count past the safe integer range instead of rounding it', () => {
    // 2^53 + 1 is not representable: the committed value would differ from the typed one.
    const onChange = renderInput({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '9007199254740993' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the refused text on screen so it can be corrected, and recovers', () => {
    const onChange = renderControlled({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '-1' } });
    expect(countInput().value).toBe('-1');

    fireEvent.change(countInput(), { target: { value: '7' } });

    expect(error()).toBeNull();
    expect(lastStartFrom(onChange)).toEqual({ type: mode, n: 7 });
  });

  it('says which count is still in effect while the entry is refused', () => {
    // The refused entry does not undo the last valid one, so Play would start from THAT. Saying so
    // is the difference between a rejected keystroke and a session that silently starts somewhere
    // the screen does not show.
    renderControlled({ type: mode, n: 5 });

    fireEvent.change(countInput(), { target: { value: '-1' } });

    expect(error()?.textContent).toMatch(/\b5\b/);
  });
});

/**
 * The two count modes look identical but are NOT bounded the same way. "Latest n messages" is
 * resolved by a synchronous backward metadata walk - roughly one broker lookup per entry - so the
 * server caps it (`latestNMaxAccepted`, ten million); "Skip first n messages" streams past its
 * messages and has no such ceiling, deliberately. A UI that accepts both alike shows a count as
 * valid and then fails only after Play, with the field it came from long out of sight - which is
 * exactly what happened when this file pinned the stale `Int.MaxValue` after the server tightened.
 */
describe('the mode-specific maximum count', () => {
  const countInput = () => screen.getByTestId('cs-start-from-n') as HTMLInputElement;
  const error = () => screen.queryByTestId('cs-start-from-n-error');

  it('mirrors the server ceiling exactly - the parity pin', () => {
    // The server side of this pin is startFromCountValidationTest, which fixes
    // `latestNMaxAccepted` at the same number. If either side moves alone, one of the two suites
    // goes red - that asymmetric window (UI accepts, server refuses after Play) is the bug.
    expect(latestMessageCountMax).toBe(10_000_000);
  });

  it('accepts exactly the ceiling for "Latest n messages"', () => {
    const onChange = renderInput({ type: 'nthMessageBeforeLatest', n: 5 });

    fireEvent.change(countInput(), { target: { value: String(latestMessageCountMax) } });

    expect(error()).toBeNull();
    expect(lastStartFrom(onChange)).toEqual({ type: 'nthMessageBeforeLatest', n: latestMessageCountMax });
  });

  it('refuses one more than the ceiling for "Latest n messages"', () => {
    const onChange = renderInput({ type: 'nthMessageBeforeLatest', n: 5 });

    fireEvent.change(countInput(), { target: { value: String(latestMessageCountMax + 1) } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says what the ceiling is, not merely that the number is wrong', () => {
    renderControlled({ type: 'nthMessageBeforeLatest', n: 5 });

    fireEvent.change(countInput(), { target: { value: String(latestMessageCountMax + 1) } });

    expect(error()?.textContent).toContain(String(latestMessageCountMax));
  });

  it('does not impose that ceiling on "Skip first n messages"', () => {
    // Skip-N has no server-side maximum, so borrowing Latest-N's would refuse a count the server
    // would happily serve.
    const onChange = renderInput({ type: 'nthMessageAfterEarliest', n: 5 });

    fireEvent.change(countInput(), { target: { value: String(latestMessageCountMax + 1) } });

    expect(error()).toBeNull();
    expect(lastStartFrom(onChange)).toEqual({ type: 'nthMessageAfterEarliest', n: latestMessageCountMax + 1 });
  });

  it('tells the browser about the ceiling too, for the spinner and the native step', () => {
    renderInput({ type: 'nthMessageBeforeLatest', n: 5 });
    expect(countInput().getAttribute('max')).toBe(String(latestMessageCountMax));

    cleanup();

    renderInput({ type: 'nthMessageAfterEarliest', n: 5 });
    expect(countInput().getAttribute('max')).toBeNull();
  });
});

describe('the message-id field', () => {
  const idInput = () => screen.getByTestId('cs-start-from-message-id') as HTMLInputElement;
  const error = () => screen.queryByTestId('cs-start-from-message-id-error');

  const messageIdStartFrom = (hexString: string) => ({
    type: 'messageId',
    messageId: {
      type: 'value',
      val: {
        metadata: { id: 'mid-1', name: '', descriptionMarkdown: '', type: 'message-id' },
        spec: { hexString },
      },
    },
  });

  it('accepts a message id as the placeholder renders one', () => {
    renderControlled(messageIdStartFrom(''));

    fireEvent.change(idInput(), { target: { value: '08 c3 03 10 cd 04 20 00 30 01' } });

    expect(error()).toBeNull();
  });

  it('says so when the text is not hex, instead of failing later inside Play', () => {
    // The parser throws on malformed hex, and it is called while the create request is being built -
    // after the click, outside any catch. The user sees a session that never starts.
    renderControlled(messageIdStartFrom(''));

    fireEvent.change(idInput(), { target: { value: 'zz' } });

    expect(error()).toBeTruthy();
    expect(idInput().value).toBe('zz');
  });

  it('says so when a byte is left half-written', () => {
    renderControlled(messageIdStartFrom(''));

    fireEvent.change(idInput(), { target: { value: '08 c' } });

    expect(error()).toBeTruthy();
  });

  // The shared hex parser deliberately reads "" as an empty byte array, because a byte payload
  // really can be empty - a message id cannot. Sending zero bytes as a start position is refused by
  // the server (`MessageId.messageId` is parsed as a real id), and the refusal arrives long after
  // the click, as a create failure with nothing on screen pointing back at this field.
  it.each([[''], ['   '], ['\t']])('says an id of %p is missing, rather than sending zero bytes', (text) => {
    renderControlled(messageIdStartFrom('08 c3'));

    fireEvent.change(idInput(), { target: { value: text } });

    expect(error()).toBeTruthy();
    expect(error()?.textContent).toMatch(/message id/i);
  });

  it('flags a message-id mode that starts out empty, before anything is typed', () => {
    // Picking the mode creates an empty id, so this is the state the user is dropped into.
    renderControlled(messageIdStartFrom(''));

    expect(error()).toBeTruthy();
  });
});

/**
 * A referenced (library-owned) start-from is shown, never edited in place - the value belongs to the
 * stored item. Both number fields forward `inputProps` alongside that, which is exactly the
 * combination that used to hand them back to the user.
 */
describe('a read-only start-from', () => {
  it('does not let the message count be edited', () => {
    renderReadOnly({ type: 'nthMessageAfterEarliest', n: 5 });

    expect((screen.getByTestId('cs-start-from-n') as HTMLInputElement).disabled).toBe(true);
  });

  it.each([
    ['approximateDataPosition', 'cs-start-from-data'],
    ['approximateTimePosition', 'cs-start-from-time'],
  ])('does not let the %s percentage be edited', (mode, prefix) => {
    renderReadOnly({ type: mode, fraction: 0.6 });

    expect((screen.getByTestId(`${prefix}-fraction`) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId(`${prefix}-fraction-slider`) as HTMLInputElement).disabled).toBe(true);
  });

  it('does not let the message id be edited', () => {
    renderReadOnly({
      type: 'messageId',
      messageId: {
        type: 'value',
        val: {
          metadata: { id: 'mid-1', name: '', descriptionMarkdown: '', type: 'message-id' },
          spec: { hexString: '08 c3' },
        },
      },
    });

    expect((screen.getByTestId('cs-start-from-message-id') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('non-persistent targets', () => {
  it('offers only Latest when nothing in the selection retains history', () => {
    renderInput({ type: 'latestMessage' }, nonPersistentOnly);

    expect(modeOptions()).toEqual({
      earliestMessage: false,
      latestMessage: true,
      messageId: false,
      dateTime: false,
      relativeDateTime: false,
      nthMessageAfterEarliest: false,
      nthMessageBeforeLatest: false,
      // Both approximate modes are history-dependent: one needs the topic's entry count, the other
      // its first and last publish times, and a non-persistent topic answers neither.
      approximateDataPosition: false,
      approximateTimePosition: false,
    });
  });

  it('disables Earliest too, because on a non-persistent topic it would quietly mean "from now"', () => {
    renderInput({ type: 'latestMessage' }, nonPersistentOnly);

    expect(modeOptions().earliestMessage).toBe(false);
  });

  it('explains why, in the reader\'s terms', () => {
    renderInput({ type: 'latestMessage' }, nonPersistentOnly);

    const note = screen.getByTestId('cs-start-from-non-persistent-note');
    expect(note.textContent).toMatch(/non-persistent/i);
    expect(note.textContent).toMatch(/no history|retain nothing|keep no history/i);
    // Plain language, not Pulsar internals.
    expect(note.textContent).not.toMatch(/examineMessage|405|broker/i);
  });

  it('falls back to Latest when the selected mode became unusable', () => {
    // The user had picked a history mode, then pointed the session at a non-persistent topic.
    const onChange = renderInput({ type: 'nthMessageAfterEarliest', n: 5 }, nonPersistentOnly);

    expect(lastStartFrom(onChange)).toEqual({ type: 'latestMessage' });
  });

  it('leaves an already-valid selection alone', () => {
    const onChange = renderInput({ type: 'latestMessage' }, nonPersistentOnly);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps every mode when the selection is mixed, and says the non-persistent parts start from now', () => {
    const onChange = renderInput({ type: 'nthMessageAfterEarliest', n: 5 }, mixed);

    expect(Object.values(modeOptions()).every((enabled) => enabled)).toBe(true);
    expect(screen.getByTestId('cs-start-from-mixed-persistency-note').textContent).toMatch(/non-persistent/i);
    expect(screen.queryByTestId('cs-start-from-non-persistent-note')).toBeNull();
    // A mixed selection is legal - nothing may be rewritten under the user.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says nothing at all when every selected topic retains history', () => {
    renderInput({ type: 'nthMessageAfterEarliest', n: 5 }, { hasPersistent: true, hasNonPersistent: false });

    expect(Object.values(modeOptions()).every((enabled) => enabled)).toBe(true);
    expect(screen.queryByTestId('cs-start-from-non-persistent-note')).toBeNull();
    expect(screen.queryByTestId('cs-start-from-mixed-persistency-note')).toBeNull();
  });

  it('says nothing when there is no target context at all, as in the library item editor', () => {
    renderInput({ type: 'nthMessageAfterEarliest', n: 5 });

    expect(Object.values(modeOptions()).every((enabled) => enabled)).toBe(true);
    expect(screen.queryByTestId('cs-start-from-non-persistent-note')).toBeNull();
    expect(screen.queryByTestId('cs-start-from-mixed-persistency-note')).toBeNull();
  });
});

describe('counted modes disclose their ordering basis', () => {
  // The labels "Skip first n messages" / "Latest n messages" used to promise exact global semantics
  // the server cannot provide - Pulsar keeps append order per partition, not a global publish-time
  // sequence. The server-side contract lives in MessageOrderKey's scaladoc; this note is the
  // user-facing half. The COUNT is always exactly n; WHICH n can differ when producer clocks
  // disagree, and hiding that in a doc comment nobody reads was the review complaint.
  it.each([
    ['nthMessageAfterEarliest', { type: 'nthMessageAfterEarliest', n: 5 }],
    ['nthMessageBeforeLatest', { type: 'nthMessageBeforeLatest', n: 5 }],
  ])('%s shows the ordering note', (_name, startFrom) => {
    renderInput(startFrom);
    const note = screen.getByTestId('cs-start-from-counted-note');
    expect(note.textContent).toMatch(/exactly n/i);
    expect(note.textContent).toMatch(/publish time/i);
    expect(note.textContent).toMatch(/clocks/i);
  });

  it('modes that seek exactly do not carry the note', () => {
    renderInput({ type: 'earliestMessage' });
    expect(screen.queryByTestId('cs-start-from-counted-note')).toBeNull();
  });
});

describe('the "single non-partitioned topic" hint sits only where it is true', () => {
  // A message id names one entry in one topic's log, so it genuinely wants a single non-partitioned
  // topic. The counted modes are exact-count ACROSS partitions (the counted-note says as much), so
  // the same hint there undersells them - it used to appear on all three, pre-rework.
  const hint = () => screen.queryByText(/works best with a single non-partitioned topic/i);

  const messageIdStartFrom = {
    type: 'messageId',
    messageId: {
      type: 'value',
      val: {
        metadata: { id: 'mid-1', name: '', descriptionMarkdown: '', type: 'message-id' },
        spec: { hexString: '08 c3' },
      },
    },
  };

  it('shows it for a message id, where a single-topic position is the accurate advice', () => {
    renderInput(messageIdStartFrom);
    expect(hint()).toBeTruthy();
  });

  it.each([
    ['nthMessageAfterEarliest', { type: 'nthMessageAfterEarliest', n: 5 }],
    ['nthMessageBeforeLatest', { type: 'nthMessageBeforeLatest', n: 5 }],
  ])('does not show it for %s, whose count is exact across partitions', (_name, startFrom) => {
    renderInput(startFrom);
    expect(hint()).toBeNull();
    // The counted-note is what speaks for these modes now, and it does not undersell them.
    expect(screen.getByTestId('cs-start-from-counted-note')).toBeTruthy();
  });
});
