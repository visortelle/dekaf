import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { hexStringFromByteArray } from '../../../../conversions/conversions';

/**
 * One row of the Topic Positions debug view.
 *
 * EVERY FIGURE IS OPTIONAL, and `undefined` means "not known" - never zero. The distinction is the
 * whole point of the view: a cursor sitting on the first retained entry genuinely IS 0% through,
 * while a topic whose cursor has aged out from under retention knows nothing about where it is. A
 * table that rendered both as "0%" would quietly invent the second one.
 */
export type TopicPositionRow = {
  topicFqn: string;
  firstMessageId?: string;
  firstPublishTime?: number;
  lastMessageId?: string;
  lastPublishTime?: number;
  cursorMessageId?: string;
  cursorPublishTime?: number;
  cursorTimeFraction?: number;
  cursorEntryFraction?: number;
  cursorEntryOrdinal?: number;
  retainedEntries?: number;
  /** Set when the broker refused the topic - a non-persistent one cannot be examined at all. */
  unavailableReason?: string;
  /** The synthetic "All topics" summary row - pinned first, exempt from per-topic semantics. */
  isAggregate?: boolean;
};

/** What the table prints where it has nothing to print. */
export const noValue = '-';

const bytesToHex = (v?: { getValue_asU8: () => Uint8Array }): string | undefined => {
  const bytes = v?.getValue_asU8?.();
  return bytes === undefined || bytes.length === 0 ? undefined : hexStringFromByteArray(bytes, 'hex-with-space');
};

const num = (v?: { getValue: () => number }): number | undefined => (v === undefined ? undefined : v.getValue());

/**
 * Read one row off the wire.
 *
 * An UNSET protobuf wrapper stays `undefined` here rather than becoming 0 - see [[TopicPositionRow]]
 * for why that distinction is load-bearing rather than fussy.
 */
export function topicPositionFromPb(position: pb.TopicPosition): TopicPositionRow {
  return {
    topicFqn: position.getTopicFqn(),
    firstMessageId: bytesToHex(position.getFirstMessageId() as never),
    firstPublishTime: num(position.getFirstPublishTime() as never),
    lastMessageId: bytesToHex(position.getLastMessageId() as never),
    lastPublishTime: num(position.getLastPublishTime() as never),
    cursorMessageId: bytesToHex(position.getCursorMessageId() as never),
    cursorPublishTime: num(position.getCursorPublishTime() as never),
    cursorTimeFraction: num(position.getCursorTimeFraction() as never),
    cursorEntryFraction: num(position.getCursorEntryFraction() as never),
    cursorEntryOrdinal: num(position.getCursorEntryOrdinal() as never),
    retainedEntries: num(position.getRetainedEntries() as never),
    unavailableReason: position.getUnavailableReason()?.getValue() || undefined
  };
}

/**
 * A fraction as a percentage.
 *
 * One decimal place because the interesting readings are the ones near the ends - "99.9%" and "100%"
 * are different answers on a session that is nearly done versus done, and rounding to whole percent
 * would merge them.
 */
export function formatFraction(fraction: number | undefined): string {
  if (fraction === undefined || !Number.isFinite(fraction)) {
    return noValue;
  }
  return `${(fraction * 100).toFixed(1)}%`;
}

/** An epoch millisecond as a local timestamp, or the placeholder when there is none. */
export function formatTimestamp(epochMs: number | undefined): string {
  if (epochMs === undefined || !Number.isFinite(epochMs)) {
    return noValue;
  }
  return new Date(epochMs).toLocaleString();
}

/** `ordinal / total`, the arithmetic behind the entry percentage, shown so it can be checked. */
export function formatEntryCount(ordinal: number | undefined, retained: number | undefined): string {
  if (ordinal === undefined || retained === undefined) {
    return noValue;
  }
  return `${ordinal.toLocaleString()} / ${retained.toLocaleString()}`;
}

/**
 * How far the session's read position trails the newest message, in wall-clock milliseconds - the
 * consumer-lag clock, and the first thing to check on "why am I seeing old data": a large value is
 * lag, a small one on a quiet topic is just no traffic.
 *
 * Clamped at zero: the endpoints and the cursor are separate lookups, so a message published
 * between them can put the cursor "ahead" of the recorded end - stale denominator, not time travel.
 */
export function behindMsOf(row: Pick<TopicPositionRow, 'lastPublishTime' | 'cursorPublishTime'>): number | undefined {
  if (row.lastPublishTime === undefined || row.cursorPublishTime === undefined) {
    return undefined;
  }
  return Math.max(0, row.lastPublishTime - row.cursorPublishTime);
}

/** A duration as humans read one: "3d 4h", "2h 05m", "45s", "<1s". */
export function formatDurationMs(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) {
    return noValue;
  }
  if (ms < 1000) {
    return '<1s';
  }
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

/** The label of the synthetic aggregate row. */
export const allTopicsLabel = 'All topics';

/** What the loader needs from the outside world - injectable, so every transition is a unit test. */
export type PositionsFetch = () => Promise<{
  code: number | undefined;
  message: string | undefined;
  rows: TopicPositionRow[];
}>;

/**
 * Build the polling loader the shared Table drives.
 *
 * THE LOADER NEVER THROWS, by design: the Table toasts its data-loader errors on every render, so
 * a 1-second poll that throws is a toast storm. Instead every answer is classified here - success
 * replaces the last-good rows (and prepends the aggregate), a missing session means "empty" (the
 * session was deleted underneath; not a fault worth shouting about every second), and everything
 * else KEEPS the last-good rows on screen and reports through `onError` - stale data with a banner
 * beats a blank table with a toast.
 */
export function makePositionsLoader(deps: {
  fetch: PositionsFetch;
  okCode: number;
  failedPreconditionCode: number;
  onError: (message: string | undefined) => void;
}): () => Promise<TopicPositionRow[]> {
  let lastGood: TopicPositionRow[] = [];

  return async () => {
    let answer;
    try {
      answer = await deps.fetch();
    } catch (err) {
      deps.onError(`${(err as Error)?.message ?? err}`);
      return lastGood;
    }

    if (answer.code === deps.failedPreconditionCode) {
      // The session vanished mid-run (deleted elsewhere). Yesterday's rows belong to a session
      // that no longer exists - clear rather than display them as current.
      deps.onError(undefined);
      lastGood = [];
      return lastGood;
    }

    if (answer.code !== deps.okCode) {
      deps.onError(answer.message || 'The consumer session did not answer.');
      return lastGood;
    }

    deps.onError(undefined);
    const aggregate = aggregateRow(answer.rows);
    lastGood = aggregate === undefined ? answer.rows : [aggregate, ...answer.rows];
    return lastGood;
  };
}

/**
 * The "All topics" row: the session's whole watch, one line.
 *
 * ONLY WHAT AGGREGATES HONESTLY IS AGGREGATED. First/last publish times take the min/max across
 * topics - the session's global time range. "% of entries" is the sum of consumed ordinals over
 * the sum of retained entries. "Behind" is the WORST topic's lag, because "how far behind is this
 * session" is answered by its laggiest member. "% of time range" places that same laggiest cursor
 * inside the global range. Message ids do not aggregate - there is no such thing as a global
 * message id - so those cells stay blank, and rows a broker refused (non-persistent) contribute
 * nothing rather than zeros.
 */
export function aggregateRow(rows: TopicPositionRow[]): TopicPositionRow | undefined {
  const usable = rows.filter((r) => r.unavailableReason === undefined && !r.isAggregate);
  if (usable.length < 2) {
    return undefined;
  }

  const defined = <T,>(values: (T | undefined)[]): T[] => values.filter((v): v is T => v !== undefined);

  const firsts = defined(usable.map((r) => r.firstPublishTime));
  const lasts = defined(usable.map((r) => r.lastPublishTime));
  const cursors = defined(usable.map((r) => r.cursorPublishTime));
  const behinds = defined(usable.map((r) => behindMsOf(r)));
  const withEntries = usable.filter((r) => r.cursorEntryOrdinal !== undefined && r.retainedEntries !== undefined);

  const firstPublishTime = firsts.length > 0 ? Math.min(...firsts) : undefined;
  const lastPublishTime = lasts.length > 0 ? Math.max(...lasts) : undefined;
  // The LAGGIEST cursor stands for the session: the range up to it is what the whole session has
  // certainly covered.
  const cursorPublishTime = cursors.length === usable.length && cursors.length > 0 ? Math.min(...cursors) : undefined;

  const ordinalSum = withEntries.reduce((acc, r) => acc + (r.cursorEntryOrdinal as number), 0);
  const retainedSum = defined(usable.map((r) => r.retainedEntries)).reduce((acc, v) => acc + v, 0);

  let cursorTimeFraction: number | undefined = undefined;
  if (firstPublishTime !== undefined && lastPublishTime !== undefined && cursorPublishTime !== undefined && lastPublishTime > firstPublishTime) {
    cursorTimeFraction = Math.min(1, Math.max(0, (cursorPublishTime - firstPublishTime) / (lastPublishTime - firstPublishTime)));
  }

  return {
    topicFqn: allTopicsLabel,
    isAggregate: true,
    firstPublishTime,
    lastPublishTime,
    // behindMsOf(aggregate) must answer the WORST lag, so the aggregate stores the laggiest
    // cursor against the global newest message; the two line up by construction.
    cursorPublishTime: behinds.length === usable.length && lastPublishTime !== undefined && behinds.length > 0
      ? lastPublishTime - Math.max(...behinds)
      : cursorPublishTime,
    cursorTimeFraction,
    cursorEntryFraction: withEntries.length === usable.length && retainedSum > 0 ? Math.min(1, ordinalSum / retainedSum) : undefined,
    cursorEntryOrdinal: withEntries.length === usable.length && withEntries.length > 0 ? ordinalSum : undefined,
    retainedEntries: retainedSum > 0 ? retainedSum : undefined
  };
}
