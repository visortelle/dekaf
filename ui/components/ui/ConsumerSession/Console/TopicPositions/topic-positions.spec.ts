/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The Topic Positions row model and its formatters.
 *
 * The behaviour worth pinning is the one distinction the whole view rests on: ABSENT is not ZERO. A
 * cursor on the first retained entry really is 0% through; a cursor whose ledger has aged out knows
 * nothing about where it is. Rendering both as "0.0%" would invent the second, and every unset
 * protobuf wrapper is a chance to do exactly that.
 */
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import {
  aggregateRow,
  allTopicsLabel,
  behindMsOf,
  formatDurationMs,
  makePositionsLoader,
  TopicPositionRow,
  formatEntryCount,
  formatFraction,
  formatTimestamp,
  noValue,
  topicPositionFromPb
} from './topic-positions';

describe('formatFraction', () => {
  it('renders a real fraction as a percentage, keeping one decimal', () => {
    // 99.9% and 100% are different answers - nearly done versus done - and whole percent merges them.
    expect(formatFraction(0.999)).toBe('99.9%');
    expect(formatFraction(1)).toBe('100.0%');
  });

  it('renders a genuine ZERO as 0.0%, because a cursor at the first entry IS at the start', () => {
    expect(formatFraction(0)).toBe('0.0%');
  });

  it('renders UNKNOWN as the placeholder, never as zero', () => {
    expect(formatFraction(undefined)).toBe(noValue);
  });

  it('refuses a non-finite fraction rather than printing NaN%', () => {
    expect(formatFraction(NaN)).toBe(noValue);
    expect(formatFraction(Infinity)).toBe(noValue);
  });
});

describe('formatTimestamp', () => {
  it('renders an epoch millisecond', () => {
    expect(formatTimestamp(0)).not.toBe(noValue);
    expect(formatTimestamp(1785152235757)).not.toBe(noValue);
  });

  it('renders UNKNOWN as the placeholder - an empty topic has no first message', () => {
    expect(formatTimestamp(undefined)).toBe(noValue);
    expect(formatTimestamp(NaN)).toBe(noValue);
  });
});

describe('formatEntryCount', () => {
  it('shows the arithmetic behind the percentage', () => {
    expect(formatEntryCount(50, 100)).toBe('50 / 100');
  });

  it('needs BOTH halves - an ordinal with no denominator says nothing', () => {
    expect(formatEntryCount(50, undefined)).toBe(noValue);
    expect(formatEntryCount(undefined, 100)).toBe(noValue);
  });
});

describe('topicPositionFromPb', () => {
  it('leaves every unset wrapper undefined rather than defaulting it to zero', () => {
    // What an EMPTY topic answers with: it was asked successfully and holds nothing, so there is no
    // first message, no last message, and no cursor - and no reason either, because nothing failed.
    const position = new pb.TopicPosition();
    position.setTopicFqn('persistent://t/n/empty');

    const row = topicPositionFromPb(position);

    expect(row.topicFqn).toBe('persistent://t/n/empty');
    expect(row.firstMessageId).toBeUndefined();
    expect(row.firstPublishTime).toBeUndefined();
    expect(row.lastMessageId).toBeUndefined();
    expect(row.lastPublishTime).toBeUndefined();
    expect(row.cursorMessageId).toBeUndefined();
    expect(row.cursorPublishTime).toBeUndefined();
    expect(row.cursorTimeFraction).toBeUndefined();
    expect(row.cursorEntryFraction).toBeUndefined();
    expect(row.cursorEntryOrdinal).toBeUndefined();
    expect(row.retainedEntries).toBeUndefined();
    expect(row.unavailableReason).toBeUndefined();
  });

  it('carries a fraction of exactly 0 through as 0, not as absent', () => {
    // The mirror of the test above, and the reason the reader cannot use a falsy check anywhere in
    // this path: 0 is a real reading.
    const position = new pb.TopicPosition();
    position.setTopicFqn('persistent://t/n/topic');
    const fraction = new (require('google-protobuf/google/protobuf/wrappers_pb').DoubleValue)();
    fraction.setValue(0);
    position.setCursorTimeFraction(fraction);

    const row = topicPositionFromPb(position);

    expect(row.cursorTimeFraction).toBe(0);
    expect(formatFraction(row.cursorTimeFraction)).toBe('0.0%');
  });

  it('reads the endpoints, the cursor and both progress figures when they are all present', () => {
    const { BytesValue, DoubleValue, Int64Value, StringValue } = require('google-protobuf/google/protobuf/wrappers_pb');
    const position = new pb.TopicPosition();
    position.setTopicFqn('persistent://t/n/topic');

    const firstId = new BytesValue();
    firstId.setValue(new Uint8Array([1, 2]));
    position.setFirstMessageId(firstId);

    const firstTime = new Int64Value();
    firstTime.setValue(1000);
    position.setFirstPublishTime(firstTime);

    const timeFraction = new DoubleValue();
    timeFraction.setValue(0.5);
    position.setCursorTimeFraction(timeFraction);

    const ordinal = new Int64Value();
    ordinal.setValue(50);
    position.setCursorEntryOrdinal(ordinal);

    const retained = new Int64Value();
    retained.setValue(100);
    position.setRetainedEntries(retained);

    const row = topicPositionFromPb(position);

    expect(row.firstMessageId).toBeDefined();
    expect(row.firstPublishTime).toBe(1000);
    expect(row.cursorTimeFraction).toBe(0.5);
    expect(formatEntryCount(row.cursorEntryOrdinal, row.retainedEntries)).toBe('50 / 100');
  });

  it('reads the unavailable reason - a refused topic is not an empty one', () => {
    const { StringValue } = require('google-protobuf/google/protobuf/wrappers_pb');
    const position = new pb.TopicPosition();
    position.setTopicFqn('non-persistent://t/n/topic');
    const reason = new StringValue();
    reason.setValue('Examine messages on a non-persistent topic is not allowed');
    position.setUnavailableReason(reason);

    const row = topicPositionFromPb(position);

    expect(row.unavailableReason).toContain('non-persistent');
  });
});


describe('behindMsOf - the consumer-lag clock', () => {
  it('is last published minus cursor published', () => {
    expect(behindMsOf({ lastPublishTime: 5000, cursorPublishTime: 2000 })).toBe(3000);
  });

  it('clamps at zero - a cursor past the recorded end is a stale denominator, not time travel', () => {
    expect(behindMsOf({ lastPublishTime: 2000, cursorPublishTime: 5000 })).toBe(0);
  });

  it('is unknown when either side is unknown', () => {
    expect(behindMsOf({ lastPublishTime: 5000, cursorPublishTime: undefined })).toBeUndefined();
    expect(behindMsOf({ lastPublishTime: undefined, cursorPublishTime: 2000 })).toBeUndefined();
  });
});

describe('formatDurationMs', () => {
  it('reads as humans write durations', () => {
    expect(formatDurationMs(500)).toBe('<1s');
    expect(formatDurationMs(45_000)).toBe('45s');
    expect(formatDurationMs(2 * 60_000 + 5_000)).toBe('2m 05s');
    expect(formatDurationMs(2 * 3_600_000 + 5 * 60_000)).toBe('2h 05m');
    expect(formatDurationMs(3 * 86_400_000 + 4 * 3_600_000)).toBe('3d 4h');
  });

  it('unknown and nonsense are the placeholder', () => {
    expect(formatDurationMs(undefined)).toBe('-');
    expect(formatDurationMs(-5)).toBe('-');
    expect(formatDurationMs(NaN)).toBe('-');
  });
});

describe('aggregateRow - the "All topics" line', () => {
  const row = (over: Partial<TopicPositionRow>): TopicPositionRow => ({ topicFqn: 't', ...over });

  it('takes the global time range, the WORST lag, and the summed entries', () => {
    const a = row({ topicFqn: 'a', firstPublishTime: 1000, lastPublishTime: 9000, cursorPublishTime: 8000, cursorEntryOrdinal: 90, retainedEntries: 100 });
    const b = row({ topicFqn: 'b', firstPublishTime: 2000, lastPublishTime: 10_000, cursorPublishTime: 4000, cursorEntryOrdinal: 10, retainedEntries: 100 });

    const all = aggregateRow([a, b]);

    expect(all?.topicFqn).toBe(allTopicsLabel);
    expect(all?.isAggregate).toBe(true);
    expect(all?.firstPublishTime).toBe(1000);
    expect(all?.lastPublishTime).toBe(10_000);
    // b is 6000ms behind (10000-4000), a only 1000ms (9000-8000... vs global last: a is 2000
    // behind the GLOBAL newest) - the aggregate answers with the WORST: 6000.
    expect(behindMsOf(all!)).toBe(6000);
    expect(all?.cursorEntryOrdinal).toBe(100);
    expect(all?.retainedEntries).toBe(200);
    expect(all?.cursorEntryFraction).toBe(0.5);
  });

  it('does not exist for a single topic - a summary of one is noise', () => {
    expect(aggregateRow([row({ topicFqn: 'only' })])).toBeUndefined();
  });

  it('unavailable rows contribute NOTHING, not zeros', () => {
    const ok1 = row({ topicFqn: 'a', firstPublishTime: 1000, lastPublishTime: 2000 });
    const ok2 = row({ topicFqn: 'b', firstPublishTime: 1500, lastPublishTime: 3000 });
    const refused = row({ topicFqn: 'np', unavailableReason: 'non-persistent' });

    const all = aggregateRow([ok1, ok2, refused]);
    expect(all?.firstPublishTime).toBe(1000);
    expect(all?.lastPublishTime).toBe(3000);
  });

  it('a topic with no cursor leaves the aggregate positions unknown rather than guessed', () => {
    const read = row({ topicFqn: 'a', firstPublishTime: 1000, lastPublishTime: 2000, cursorPublishTime: 1500 });
    const unread = row({ topicFqn: 'b', firstPublishTime: 1000, lastPublishTime: 2000 });

    const all = aggregateRow([read, unread]);
    expect(all?.cursorTimeFraction).toBeUndefined();
    expect(behindMsOf(all!)).toBeUndefined();
  });
});

describe('makePositionsLoader - what the polling Table is allowed to see', () => {
  const okRow = (fqn: string): TopicPositionRow => ({ topicFqn: fqn, firstPublishTime: 1, lastPublishTime: 2 });
  const OK = 0;
  const FAILED_PRECONDITION = 9;

  it('success replaces last-good and prepends the aggregate for multi-topic sessions', async () => {
    const onError = jest.fn();
    const loader = makePositionsLoader({
      okCode: OK,
      failedPreconditionCode: FAILED_PRECONDITION,
      onError,
      fetch: async () => ({ code: OK, message: '', rows: [okRow('a'), okRow('b')] })
    });

    const rows = await loader();
    expect(rows.map((r) => r.topicFqn)).toEqual([allTopicsLabel, 'a', 'b']);
    expect(onError).toHaveBeenLastCalledWith(undefined);
  });

  it('a transport failure KEEPS the last-good rows and reports the error - never throws', async () => {
    const onError = jest.fn();
    let fail = false;
    const loader = makePositionsLoader({
      okCode: OK,
      failedPreconditionCode: FAILED_PRECONDITION,
      onError,
      fetch: async () => {
        if (fail) {
          throw new Error('connection refused');
        }
        return { code: OK, message: '', rows: [okRow('a'), okRow('b')] };
      }
    });

    const good = await loader();
    fail = true;
    const afterFailure = await loader();

    expect(afterFailure).toEqual(good);
    expect(String(onError.mock.calls[onError.mock.calls.length - 1][0])).toContain('connection refused');
  });

  it('a non-OK answer keeps last-good too, and recovery clears the error', async () => {
    const onError = jest.fn();
    let mode: 'ok' | 'broken' = 'ok';
    const loader = makePositionsLoader({
      okCode: OK,
      failedPreconditionCode: FAILED_PRECONDITION,
      onError,
      fetch: async () =>
        mode === 'ok'
          ? { code: OK, message: '', rows: [okRow('a'), okRow('b')] }
          : { code: 2, message: 'the broker fell over', rows: [] }
    });

    const good = await loader();
    mode = 'broken';
    expect(await loader()).toEqual(good);
    expect(onError).toHaveBeenLastCalledWith('the broker fell over');
    mode = 'ok';
    await loader();
    expect(onError).toHaveBeenLastCalledWith(undefined);
  });

  it('a vanished session clears the table - stale rows must not pose as current', async () => {
    const onError = jest.fn();
    let gone = false;
    const loader = makePositionsLoader({
      okCode: OK,
      failedPreconditionCode: FAILED_PRECONDITION,
      onError,
      fetch: async () =>
        gone
          ? { code: FAILED_PRECONDITION, message: 'no such session', rows: [] }
          : { code: OK, message: '', rows: [okRow('a'), okRow('b')] }
    });

    await loader();
    gone = true;
    expect(await loader()).toEqual([]);
    expect(onError).toHaveBeenLastCalledWith(undefined);
  });
});
