import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { hexStringFromByteArray } from '../../../../conversions/conversions';

/**
 * One row of the Topic Positions debug view.
 *
 * EVERY FIGURE IS OPTIONAL, and `undefined` means "not known" - never zero. The distinction is the
 * whole point of the view: the first of N stored entries has position 1/N, while a topic whose
 * session position has aged out from under retention knows nothing about where it is. A table that
 * rendered the latter as "0%" would quietly invent a value.
 */
export type TopicPositionRow = {
  topicFqn: string;
  firstMessageId?: string;
  firstPublishTime?: number;
  lastMessageId?: string;
  lastPublishTime?: number;
  firstConsumedMessageId?: string;
  firstConsumedPublishTime?: number;
  lastConsumedMessageId?: string;
  lastConsumedPublishTime?: number;
  /** Internal high-water mark used by progress calculations; the per-topic value is furthest processed. */
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
  const cursorMessageId = bytesToHex(position.getCursorMessageId() as never);
  const cursorPublishTime = num(position.getCursorPublishTime() as never);
  return {
    topicFqn: position.getTopicFqn(),
    firstMessageId: bytesToHex(position.getFirstMessageId() as never),
    firstPublishTime: num(position.getFirstPublishTime() as never),
    lastMessageId: bytesToHex(position.getLastMessageId() as never),
    lastPublishTime: num(position.getLastPublishTime() as never),
    firstConsumedMessageId: bytesToHex(position.getFirstConsumedMessageId() as never),
    firstConsumedPublishTime: num(position.getFirstConsumedPublishTime() as never),
    // The server's cursor is the furthest/newest processed log position. Keep the cursor aliases
    // for the progress arithmetic and expose the same endpoint under its user-facing name.
    lastConsumedMessageId: cursorMessageId,
    lastConsumedPublishTime: cursorPublishTime,
    cursorMessageId,
    cursorPublishTime,
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
  const date = dateOf(epochMs);
  if (date === undefined) {
    return noValue;
  }
  return date.toLocaleString();
}

/** The exact, locale-independent timestamp copied out of a displayed time cell. */
export function timestampIso(epochMs: number | undefined): string | undefined {
  return dateOf(epochMs)?.toISOString();
}

/** `ordinal / total`, the arithmetic behind the entry percentage, shown so it can be checked. */
export function formatEntryCount(ordinal: number | undefined, retained: number | undefined): string {
  if (ordinal === undefined || retained === undefined || !Number.isFinite(ordinal) || !Number.isFinite(retained)) {
    return noValue;
  }
  return `${ordinal.toLocaleString()} / ${retained.toLocaleString()}`;
}

/** Entries currently stored after the session position. Separate broker snapshots can briefly make
 * the position exceed the reported total; that means none are known to be after it, not a
 * negative backlog. */
export function entriesAfterCursorOf(
  row: Pick<TopicPositionRow, 'cursorEntryOrdinal' | 'retainedEntries'>
): number | undefined {
  if (
    row.cursorEntryOrdinal === undefined ||
    row.retainedEntries === undefined ||
    !Number.isFinite(row.cursorEntryOrdinal) ||
    !Number.isFinite(row.retainedEntries)
  ) {
    return undefined;
  }
  return Math.max(0, row.retainedEntries - row.cursorEntryOrdinal);
}

const dateOf = (epochMs: number | undefined): Date | undefined => {
  if (epochMs === undefined || !Number.isFinite(epochMs)) {
    return undefined;
  }
  const date = new Date(epochMs);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

/**
 * Approximate publish-time distance between the newest retained endpoint and the session's
 * furthest consumed endpoint. This is useful context for "why am I seeing old data", but it is not
 * a subscription backlog: publish times come from producers and the two endpoints are refreshed
 * separately.
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
 * replaces the last-good rows (and prepends the aggregate), a vanished session is TERMINAL and
 * reported through `onSessionGone` so the caller can stop asking, and everything else KEEPS the
 * last-good rows on screen and reports through `onError` - stale data with a banner beats a blank
 * table with a toast.
 *
 * The three outcomes are genuinely different and the caller must be able to tell them apart: an OK
 * answer with no topics is an EMPTY session, a transport failure is a RETRYABLE fault, and
 * FAILED_PRECONDITION is the server saying the session no longer exists. Only the last one is
 * final; the first two are worth polling again.
 */
export function makePositionsLoader(deps: {
  fetch: PositionsFetch;
  okCode: number;
  failedPreconditionCode: number;
  onError: (message: string | undefined) => void;
  /**
   * The session is gone or terminal and will never answer again. Required, not optional: the
   * server returns FAILED_PRECONDITION precisely so the client stops scanning, and a caller that
   * silently ignored it would poll a dead session for as long as the tab stays open.
   */
  onSessionGone: (message: string | undefined) => void;
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
      // The session vanished mid-run (deleted elsewhere, reaped, or stopped). Yesterday's rows
      // belong to a session that no longer exists - clear rather than display them as current,
      // and tell the caller this is the end rather than an empty reading.
      deps.onError(undefined);
      deps.onSessionGone(answer.message || undefined);
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
 * ONLY WHAT AGGREGATES HONESTLY IS AGGREGATED. Retained first/last publish times take the min/max
 * across broker-readable topics. Consumed publish times take the min/max across ALL topic rows,
 * because those are session-local facts that remain known when retained-log inspection fails.
 * The retained-entry fraction is the sum of cursor ordinals over retained entries. Publish-time
 * lag is the WORST topic's value. Message ids do not aggregate - there is no global cross-topic
 * message id - so all four id cells stay blank.
 */
export function aggregateRow(rows: TopicPositionRow[]): TopicPositionRow | undefined {
  const members = rows.filter((r) => !r.isAggregate);
  if (members.length < 2) {
    return undefined;
  }
  const usable = members.filter((r) => r.unavailableReason === undefined);

  const defined = <T,>(values: (T | undefined)[]): T[] => values.filter((v): v is T => v !== undefined);

  const firsts = defined(usable.map((r) => r.firstPublishTime));
  const lasts = defined(usable.map((r) => r.lastPublishTime));
  const cursors = defined(usable.map((r) => r.cursorPublishTime));
  const behinds = defined(usable.map((r) => behindMsOf(r)));
  const withEntries = usable.filter((r) => r.cursorEntryOrdinal !== undefined && r.retainedEntries !== undefined);
  const firstConsumedTimes = defined(members.map((r) => r.firstConsumedPublishTime));
  const lastConsumedTimes = defined(members.map((r) => r.lastConsumedPublishTime));

  const firstPublishTime = firsts.length > 0 ? Math.min(...firsts) : undefined;
  const lastPublishTime = lasts.length > 0 ? Math.max(...lasts) : undefined;
  // The LAGGIEST cursor stands for the session: the range up to it is what the whole session has
  // certainly covered.
  const cursorPublishTime = cursors.length === usable.length && cursors.length > 0 ? Math.min(...cursors) : undefined;

  const ordinalSum = withEntries.reduce((acc, r) => acc + (r.cursorEntryOrdinal as number), 0);
  const retainedSum = defined(usable.map((r) => r.retainedEntries)).reduce((acc, v) => acc + v, 0);

  let cursorTimeFraction: number | undefined = undefined;
  if (
    firstPublishTime !== undefined &&
    lastPublishTime !== undefined &&
    cursorPublishTime !== undefined &&
    lastPublishTime > firstPublishTime
  ) {
    cursorTimeFraction = Math.min(1, Math.max(0, (cursorPublishTime - firstPublishTime) / (lastPublishTime - firstPublishTime)));
  }

  return {
    topicFqn: allTopicsLabel,
    isAggregate: true,
    firstPublishTime,
    lastPublishTime,
    firstConsumedPublishTime: firstConsumedTimes.length > 0 ? Math.min(...firstConsumedTimes) : undefined,
    lastConsumedPublishTime: lastConsumedTimes.length > 0 ? Math.max(...lastConsumedTimes) : undefined,
    // behindMsOf(aggregate) must answer the WORST lag, so the aggregate stores the laggiest
    // cursor against the global newest message; the two line up by construction.
    // This internal aggregate cursor exists only to make behindMsOf return the honest worst
    // per-topic lag. Falling back to the earliest known cursor would combine it with a different
    // topic's global endpoint and fabricate a lag when even one readable topic lacks an endpoint.
    // cursorTimeFraction was computed separately above and does not need this surrogate value.
    cursorPublishTime: behinds.length === usable.length && lastPublishTime !== undefined && behinds.length > 0
      ? lastPublishTime - Math.max(...behinds)
      : undefined,
    cursorTimeFraction,
    cursorEntryFraction: withEntries.length === usable.length && retainedSum > 0 ? Math.min(1, ordinalSum / retainedSum) : undefined,
    cursorEntryOrdinal: withEntries.length === usable.length && withEntries.length > 0 ? ordinalSum : undefined,
    retainedEntries: retainedSum > 0 ? retainedSum : undefined
  };
}
