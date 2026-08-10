import React from 'react';

import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { createDeadline } from '../../../../../proto-utils/proto-utils';
import { SessionState } from '../../types';
import Table, { Columns, ColumnsConfig } from '../../../Table/Table';
import Field from '../../Message/Field/Field';
import {
  TopicPositionRow,
  behindMsOf,
  entriesAfterCursorOf,
  formatDurationMs,
  formatEntryCount,
  formatFraction,
  formatTimestamp,
  makePositionsLoader,
  timestampIso,
  topicPositionFromPb
} from './topic-positions';
import s from './TopicPositions.module.css';

export type TopicPositionsProps = {
  consumerName: string;
  sessionState: SessionState;
  /** The tab is mounted while hidden, so it has to be told - polling only runs on screen. */
  isVisible: boolean;
};

type ColumnKey =
  | 'topic'
  | 'firstMessage'
  | 'firstPublished'
  | 'lastMessage'
  | 'lastPublished'
  | 'firstConsumedMessage'
  | 'firstConsumedPublished'
  // Keep the original persisted column key: this cursor is the last-consumed high-water mark.
  | 'cursorMessage'
  | 'lastConsumedPublished'
  | 'behind'
  | 'timeFraction'
  | 'entryFraction'
  | 'entriesRead'
  | 'entriesLeft';

/** Comparators here are plain and direction-blind. The Table applies direction, missing-last, and
  * aggregate pinning as separate ordering rules so none of them can accidentally invert another. */
const byRow = (
  compare: (a: TopicPositionRow, b: TopicPositionRow) => number
) => (a: { data: TopicPositionRow }, b: { data: TopicPositionRow }): number => compare(a.data, b.data);

const compareNumbers = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined && b === undefined) {
    return 0;
  }
  // Missing values are partitioned by Column.isSortValueMissing before this comparator runs. The
  // fallback still makes the function total if it is reused without that predicate.
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  return a - b;
};

const isAggregateRow = (row: TopicPositionRow): boolean => row.isAggregate === true;

const naturalTopicCompare = (a: string, b: string): number =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }) || a.localeCompare(b);

const isKnownNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

const missingNumber = (
  valueOf: (row: TopicPositionRow) => number | undefined
) => (entry: { data: TopicPositionRow }): boolean => !isKnownNumber(valueOf(entry.data));

type CellValue = string | React.ReactElement | undefined;

const aggregateCellStyle: React.CSSProperties = {
  fontWeight: 'var(--font-weight-bold)'
};

/** Reuse the consumer message table's copy interaction and raw/display conventions. Topic
  * Positions refreshes every second, so its cells deliberately use the native raw-value title
  * instead of registering thousands of changing react-tooltip anchors. */
const copyableCell = (
  isAggregate: boolean,
  title: string,
  value: CellValue,
  rawValue: string | undefined
): React.ReactElement => {
  const field = (
    <Field
      title={title}
      value={rawValue === undefined ? undefined : value}
      rawValue={rawValue}
      tooltip={undefined}
      isShowTooltips={false}
    />
  );

  return isAggregate ? (
    <div data-testid="topic-positions-aggregate-cell" style={aggregateCellStyle}>
      {field}
    </div>
  ) : field;
};

const topicCell = (row: TopicPositionRow): React.ReactElement =>
  copyableCell(
    isAggregateRow(row),
    'Topic / partition',
    row.topicFqn,
    row.topicFqn
  );

const messageIdCell = (isAggregate: boolean, title: string, value: string | undefined): React.ReactElement =>
  copyableCell(isAggregate, title, value === undefined ? undefined : <span className={s.Id}>{value}</span>, value?.replace(/\s/g, ''));

const timestampCell = (isAggregate: boolean, title: string, value: number | undefined): React.ReactElement =>
  copyableCell(isAggregate, title, isKnownNumber(value) ? formatTimestamp(value) : undefined, timestampIso(value));

const numberCell = (isAggregate: boolean, title: string, display: string, value: number | undefined): React.ReactElement =>
  copyableCell(isAggregate, title, isKnownNumber(value) ? display : undefined, isKnownNumber(value) ? String(value) : undefined);

const TopicPositions: React.FC<TopicPositionsProps> = (props) => {
  const { consumerServiceClient } = GrpcClient.useContext();
  // The loader reports here instead of throwing (the Table would toast on every render). When
  // rows are still shown, they are the LAST GOOD ones - the banner says so.
  const [loadError, setLoadError] = React.useState<string | undefined>(undefined);

  // Polling is gated by exactly two things: the TAB being the one on screen, and the session
  // existing at all. Opening the tab IS the request - the per-partition broker cost only runs
  // while somebody is looking, and the Table's own auto-refresh toggle is the explicit freeze
  // for anyone who wants the numbers to hold still. (A "capture" checkbox used to gate this too;
  // it predated the shared-Table rework, guarded nothing the tab-gate does not - the session
  // records its read position unconditionally either way - and its name wrongly implied the
  // HISTORY started when it was ticked.)
  const isSessionStarted = props.sessionState !== 'new' && props.sessionState !== 'initializing';

  // A THIRD gate, and the only terminal one: the server answered FAILED_PRECONDITION, meaning the
  // session it was asked about is gone. Polling has to STOP - the old behavior read that answer as
  // "no rows" and went on scanning a session that does not exist, once a second, for as long as
  // the tab stayed open, behind a blank table indistinguishable from a session with no topics.
  const [sessionGone, setSessionGone] = React.useState<{ message?: string } | undefined>(undefined);

  // Cleared wherever a NEW session can begin. ConsumerSession keeps one generated consumer name
  // for its whole lifetime, so Stop/Play reuses it: without the reset on the way through 'new'
  // (isSessionStarted false), the tab would stay dead for the rest of the page's life.
  React.useEffect(() => {
    setSessionGone(undefined);
  }, [props.consumerName, isSessionStarted]);

  const isPolling = props.isVisible && isSessionStarted && sessionGone === undefined;

  // One loader per consumer name, so its last-good memory dies with the session it belongs to.
  const loader = React.useMemo(
    () =>
      makePositionsLoader({
        okCode: Code.OK,
        failedPreconditionCode: Code.FAILED_PRECONDITION,
        onError: setLoadError,
        onSessionGone: (message) => setSessionGone({ message }),
        fetch: async () => {
          const req = new pb.GetTopicPositionsRequest();
          req.setConsumerName(props.consumerName);
          // The deadline is what keeps ONE hung RPC from wedging the poll forever: without it,
          // a request that never settles left `inFlight` latched and every later refresh skipped.
          const res = await consumerServiceClient.getTopicPositions(req, { deadline: createDeadline(8) });
          return {
            code: res.getStatus()?.getCode(),
            message: res.getStatus()?.getMessage(),
            rows: res.getPositionsList().map(topicPositionFromPb)
          };
        }
      }),
    [props.consumerName]
  );

  const columns: Columns<ColumnKey, TopicPositionRow, unknown> = React.useMemo(() => {
    // Put progress in the first viewport, followed by the consumed bounds and retained-log
    // context. Exact entry figures lead the approximate producer-clock figures. IDs sit beside
    // their timestamps but after them: they are exact and copyable, yet harder to scan. Any
    // non-sticky column can still be dragged elsewhere.
    const defaultConfig: ColumnsConfig<ColumnKey> = [
      { columnKey: 'topic', visibility: 'visible', width: 390, stickyTo: 'left' },
      { columnKey: 'entriesRead', visibility: 'visible', width: 170 },
      { columnKey: 'entriesLeft', visibility: 'visible', width: 150 },
      { columnKey: 'entryFraction', visibility: 'visible', width: 190 },
      { columnKey: 'behind', visibility: 'visible', width: 130 },
      { columnKey: 'timeFraction', visibility: 'visible', width: 200 },
      { columnKey: 'firstConsumedPublished', visibility: 'visible', width: 190 },
      { columnKey: 'firstConsumedMessage', visibility: 'visible', width: 160 },
      { columnKey: 'lastConsumedPublished', visibility: 'visible', width: 190 },
      { columnKey: 'cursorMessage', visibility: 'visible', width: 160 },
      { columnKey: 'firstPublished', visibility: 'visible', width: 190 },
      { columnKey: 'firstMessage', visibility: 'visible', width: 160 },
      { columnKey: 'lastPublished', visibility: 'visible', width: 190 },
      { columnKey: 'lastMessage', visibility: 'visible', width: 160 }
    ];

    const retainedValue = (row: TopicPositionRow, value: number | undefined): number | undefined =>
      row.unavailableReason === undefined ? value : undefined;

    return {
      defaultConfig,
      columns: {
        topic: {
          title: 'Topic / partition',
          render: topicCell,
          sortFn: byRow((a, b) => naturalTopicCompare(a.topicFqn, b.topicFqn))
        },
        firstMessage: {
          title: 'Earliest stored message ID',
          // Serialized IDs do not have a meaningful cross-topic ordering. Keep this exact value
          // copyable, but do not offer a misleading lexicographic sort.
          render: (row) =>
            row.unavailableReason === undefined
              ? messageIdCell(isAggregateRow(row), 'Earliest stored message ID', row.firstMessageId)
              : copyableCell(
                  isAggregateRow(row),
                  'Unavailable reason',
                  <span className={s.Unavailable} data-testid="topic-positions-unavailable">{row.unavailableReason}</span>,
                  row.unavailableReason
                )
        },
        firstPublished: {
          title: 'Earliest stored publish time',
          render: (row) => timestampCell(isAggregateRow(row), 'Earliest stored publish time', retainedValue(row, row.firstPublishTime)),
          sortFn: byRow((a, b) => compareNumbers(retainedValue(a, a.firstPublishTime), retainedValue(b, b.firstPublishTime))),
          isSortValueMissing: missingNumber((row) => retainedValue(row, row.firstPublishTime))
        },
        lastMessage: {
          title: 'Latest stored message ID',
          render: (row) =>
            messageIdCell(
              isAggregateRow(row),
              'Latest stored message ID',
              row.unavailableReason === undefined ? row.lastMessageId : undefined
            )
        },
        lastPublished: {
          title: 'Latest stored publish time',
          render: (row) => timestampCell(isAggregateRow(row), 'Latest stored publish time', retainedValue(row, row.lastPublishTime)),
          sortFn: byRow((a, b) => compareNumbers(retainedValue(a, a.lastPublishTime), retainedValue(b, b.lastPublishTime))),
          isSortValueMissing: missingNumber((row) => retainedValue(row, row.lastPublishTime))
        },
        firstConsumedMessage: {
          title: 'Earliest processed message ID',
          // Processed bounds are session-local. They stay valid even when the broker cannot expose
          // stored endpoints (for example, a non-persistent topic).
          render: (row) => messageIdCell(isAggregateRow(row), 'Earliest processed message ID', row.firstConsumedMessageId)
        },
        firstConsumedPublished: {
          title: 'Earliest processed publish time',
          render: (row) => timestampCell(isAggregateRow(row), 'Earliest processed publish time', row.firstConsumedPublishTime),
          sortFn: byRow((a, b) => compareNumbers(a.firstConsumedPublishTime, b.firstConsumedPublishTime)),
          isSortValueMissing: missingNumber((row) => row.firstConsumedPublishTime)
        },
        cursorMessage: {
          title: 'Furthest processed message ID',
          render: (row) => messageIdCell(isAggregateRow(row), 'Furthest processed message ID', row.lastConsumedMessageId)
        },
        lastConsumedPublished: {
          title: 'Furthest processed publish time',
          render: (row) => timestampCell(isAggregateRow(row), 'Furthest processed publish time', row.lastConsumedPublishTime),
          sortFn: byRow((a, b) => compareNumbers(a.lastConsumedPublishTime, b.lastConsumedPublishTime)),
          isSortValueMissing: missingNumber((row) => row.lastConsumedPublishTime)
        },
        behind: {
          title: 'Publish-time gap',
          render: (row) => {
            const value = row.unavailableReason === undefined ? behindMsOf(row) : undefined;
            return numberCell(isAggregateRow(row), 'Publish-time gap', formatDurationMs(value), value);
          },
          sortFn: byRow((a, b) =>
            compareNumbers(
              a.unavailableReason === undefined ? behindMsOf(a) : undefined,
              b.unavailableReason === undefined ? behindMsOf(b) : undefined
            )
          ),
          isSortValueMissing: missingNumber((row) => row.unavailableReason === undefined ? behindMsOf(row) : undefined)
        },
        timeFraction: {
          title: 'Publish-time position (%)',
          render: (row) => {
            const value = retainedValue(row, row.cursorTimeFraction);
            return numberCell(isAggregateRow(row), 'Publish-time position (%)', formatFraction(value), value);
          },
          sortFn: byRow((a, b) =>
            compareNumbers(retainedValue(a, a.cursorTimeFraction), retainedValue(b, b.cursorTimeFraction))
          ),
          isSortValueMissing: missingNumber((row) => retainedValue(row, row.cursorTimeFraction))
        },
        entryFraction: {
          title: 'Stored entry position (%)',
          render: (row) => {
            const value = retainedValue(row, row.cursorEntryFraction);
            return numberCell(isAggregateRow(row), 'Stored entry position (%)', formatFraction(value), value);
          },
          sortFn: byRow((a, b) =>
            compareNumbers(retainedValue(a, a.cursorEntryFraction), retainedValue(b, b.cursorEntryFraction))
          ),
          isSortValueMissing: missingNumber((row) => retainedValue(row, row.cursorEntryFraction))
        },
        entriesRead: {
          title: 'Stored entry position',
          render: (row) => {
            const ordinal = retainedValue(row, row.cursorEntryOrdinal);
            const retained = retainedValue(row, row.retainedEntries);
            const raw = isKnownNumber(ordinal) && isKnownNumber(retained) ? `${ordinal} / ${retained}` : undefined;
            return copyableCell(
              isAggregateRow(row),
              'Stored entry position',
              raw === undefined ? undefined : formatEntryCount(ordinal, retained),
              raw
            );
          },
          sortFn: byRow((a, b) => compareNumbers(a.cursorEntryOrdinal, b.cursorEntryOrdinal)),
          isSortValueMissing: ({ data: row }) =>
            row.unavailableReason !== undefined || !isKnownNumber(row.cursorEntryOrdinal) || !isKnownNumber(row.retainedEntries)
        },
        entriesLeft: {
          title: 'Stored entries after position',
          render: (row) => {
            const value = row.unavailableReason === undefined ? entriesAfterCursorOf(row) : undefined;
            return numberCell(
              isAggregateRow(row),
              'Stored entries after position',
              isKnownNumber(value) ? value.toLocaleString() : '',
              value
            );
          },
          sortFn: byRow((a, b) =>
            compareNumbers(
              a.unavailableReason === undefined ? entriesAfterCursorOf(a) : undefined,
              b.unavailableReason === undefined ? entriesAfterCursorOf(b) : undefined
            )
          ),
          isSortValueMissing: missingNumber((row) => row.unavailableReason === undefined ? entriesAfterCursorOf(row) : undefined)
        }
      },
      help: {
        topic: (
          <span>
            A non-partitioned topic or one partition of a partitioned topic. “All topics” is a Dekaf session summary.
            Numeric partition suffixes sort naturally, so partition-2 comes before partition-10.
          </span>
        ),
        firstConsumedMessage: (
          <span>
            The lowest message-ID position processed by this Dekaf session. It includes counted start-mode discards and
            messages hidden by session filters; messages bypassed by a broker seek are not observed. Older redeliveries
            can move it backward. Message IDs are not ordered across topics; “All topics” has no aggregate ID.
          </span>
        ),
        firstConsumedPublished: (
          <span>
            Pulsar publish time on “Earliest processed message ID”. The producer client sets it; it is not event time or
            the time Dekaf received the message. “All topics” shows the earliest per-topic value.
          </span>
        ),
        cursorMessage: (
          <span>
            The highest message-ID position processed by this Dekaf session. Older redeliveries do not move it backward.
            It is not a Pulsar subscription cursor or backlog. Message IDs are not ordered across topics; “All topics”
            has no aggregate ID.
          </span>
        ),
        lastConsumedPublished: (
          <span>
            Pulsar publish time on “Furthest processed message ID”. It need not be the latest observed timestamp when a
            producer clock moves backward. “All topics” shows the latest per-topic value.
          </span>
        ),
        behind: (
          <span>
            Latest stored publish time minus the publish time at the furthest processed position, clamped at zero. This
            approximate gap is not subscription backlog or wall-clock delay; producer clock skew and non-atomic refreshes
            can distort it. “All topics” shows the worst readable topic only when all have both values.
          </span>
        ),
        entriesRead: (
          <span>
            The furthest processed message's 1-based entry position and the topic's current stored-entry count. This is a
            storage position, not how many entries the session read or a subscription backlog. One producer batch is one
            entry. On read-compacted targets it still describes the original topic. Separate snapshots can briefly make
            the position exceed the total.
          </span>
        ),
        entriesLeft: (
          <span>
            Current stored entries after the furthest processed position, clamped at zero. This is not subscription
            backlog. It is blank when the ledger containing that position is no longer stored or inspection is unavailable.
          </span>
        ),
        entryFraction: (
          <span>
            Stored entry position divided by the current stored-entry count. It is not the percentage consumed or a
            message percentage; one producer batch is one entry. On read-compacted targets it still describes the original
            topic. “All topics” uses summed positions and counts when every readable topic is known.
          </span>
        ),
        timeFraction: (
          <span>
            Publish time at the furthest processed position within the earliest-to-latest stored publish-time range.
            Producer clocks need not be monotonic, so this is approximate and can be blank. “All topics” uses the combined
            stored range and earliest session position when every readable topic has one.
          </span>
        ),
        firstPublished: (
          <span>
            Pulsar publish time of the earliest currently stored entry at the latest refresh. It is not necessarily the
            earliest timestamp in the topic. “All topics” shows the minimum across readable topics.
          </span>
        ),
        firstMessage: (
          <span>
            Entry-level Pulsar message ID of the earliest currently stored entry; the batch index is omitted. Backlog,
            expiry, and retention can move it forward. Dekaf does not order message IDs across topics. If inspection is
            unavailable, this cell shows the broker reason.
          </span>
        ),
        lastPublished: (
          <span>
            Pulsar publish time of the latest currently stored entry at the latest refresh. It is not necessarily the
            latest timestamp in the topic. “All topics” shows the maximum across readable topics.
          </span>
        ),
        lastMessage: (
          <span>
            Entry-level Pulsar message ID of the latest currently stored entry; the batch index is omitted. Dekaf does not
            order message IDs across topics; use a publish-time column for cross-topic chronology.
          </span>
        )
      }
    };
  }, []);

  return (
    <div className={s.TopicPositions} data-testid="topic-positions">
      {!isSessionStarted && (
        <div className={s.Empty} data-testid="topic-positions-not-started">
          Start the session to see each topic's stored range and session position.
        </div>
      )}

      {isSessionStarted && sessionGone !== undefined && (
        <div className={s.Empty} data-testid="topic-positions-session-gone">
          This consumer session has ended, so its positions stopped updating.
          {sessionGone.message === undefined ? '' : ` ${sessionGone.message}.`}
          &nbsp;Start the session again to see them.
        </div>
      )}

      {isPolling && loadError !== undefined && (
        <div className={s.Error} data-testid="topic-positions-error">
          {loadError} - showing the last data that loaded.
        </div>
      )}

      {isPolling && (
        <div className={s.TableWrap} data-testid="topic-positions-table">
          <Table<ColumnKey, TopicPositionRow, unknown>
            tableId="topic-positions"
            size="small"
            dataLoader={{ cacheKey: [props.consumerName, 'topic-positions'], loader }}
            columns={columns}
            getId={(row) => row.topicFqn}
            autoRefresh={{ intervalMs: 1000 }}
            itemNamePlural="topics"
            defaultSort={{ type: 'by-single-column', column: 'topic', direction: 'asc' }}
            pinFirst={isAggregateRow}
          />
        </div>
      )}
    </div>
  );
};

export default TopicPositions;
