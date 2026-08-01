import React from 'react';

import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { createDeadline } from '../../../../../proto-utils/proto-utils';
import { SessionState } from '../../types';
import Table, { Columns, ColumnsConfig } from '../../../Table/Table';
import {
  TopicPositionRow,
  allTopicsLabel,
  behindMsOf,
  formatDurationMs,
  formatEntryCount,
  formatFraction,
  formatTimestamp,
  makePositionsLoader,
  noValue,
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
  | 'cursorMessage'
  | 'behind'
  | 'timeFraction'
  | 'entryFraction'
  | 'entriesRead'
  | 'entriesLeft';

/** Comparators here are plain and direction-blind; keeping the aggregate row on top under every
  * sort is the Table's job (`pinFirst`) - a comparator cannot do it, because 'desc' is the
  * reverse of the sorted array and would flip any comparator-based pin to the bottom. */
const byRow = (
  compare: (a: TopicPositionRow, b: TopicPositionRow) => number
) => (a: { data: TopicPositionRow }, b: { data: TopicPositionRow }): number => compare(a.data, b.data);

const compareNumbers = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined && b === undefined) {
    return 0;
  }
  // Unknown sorts last, so the rows with a real reading cluster at the top.
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  return a - b;
};

const isAggregateRow = (row: TopicPositionRow): boolean => row.isAggregate === true;

const mono = (v: string | undefined) => <span className={s.Id}>{v ?? noValue}</span>;

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
  const isPolling = props.isVisible && isSessionStarted;

  // One loader per consumer name, so its last-good memory dies with the session it belongs to.
  const loader = React.useMemo(
    () =>
      makePositionsLoader({
        okCode: Code.OK,
        failedPreconditionCode: Code.FAILED_PRECONDITION,
        onError: setLoadError,
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
    // Consumption columns first - how far the session got is what this tab is FOR - then the
    // topic's own endpoints. The user can drag any non-sticky column into any order; this is
    // only where they start.
    const defaultConfig: ColumnsConfig<ColumnKey> = [
      { columnKey: 'topic', visibility: 'visible', width: 390, stickyTo: 'left' },
      { columnKey: 'entriesRead', visibility: 'visible', width: 130 },
      { columnKey: 'entriesLeft', visibility: 'visible', width: 100 },
      { columnKey: 'entryFraction', visibility: 'visible', width: 100 },
      { columnKey: 'behind', visibility: 'visible', width: 90 },
      { columnKey: 'timeFraction', visibility: 'visible', width: 110 },
      { columnKey: 'firstMessage', visibility: 'visible', width: 150 },
      { columnKey: 'firstPublished', visibility: 'visible', width: 150 },
      { columnKey: 'lastMessage', visibility: 'visible', width: 150 },
      { columnKey: 'lastPublished', visibility: 'visible', width: 150 },
      { columnKey: 'cursorMessage', visibility: 'visible', width: 150 }
    ];

    // A refused topic (non-persistent: the broker cannot examine it) says WHY in its first data
    // cell and stays blank elsewhere.
    const orReason = (row: TopicPositionRow, render: () => React.ReactNode): React.ReactNode =>
      row.unavailableReason !== undefined
        ? <span className={s.Unavailable} data-testid="topic-positions-unavailable">{row.unavailableReason}</span>
        : render();

    return {
      defaultConfig,
      columns: {
        topic: {
          title: 'Topic',
          render: (row) => (
            <span className={row.isAggregate ? s.AggregateLabel : undefined} title={row.topicFqn}>{row.topicFqn}</span>
          ),
          sortFn: byRow((a, b) => a.topicFqn.localeCompare(b.topicFqn))
        },
        firstMessage: {
          title: 'First message',
          render: (row) => orReason(row, () => mono(row.firstMessageId)),
          sortFn: byRow((a, b) => (a.firstMessageId ?? '').localeCompare(b.firstMessageId ?? ''))
        },
        firstPublished: {
          title: 'First published',
          render: (row) => (row.unavailableReason !== undefined ? noValue : formatTimestamp(row.firstPublishTime)),
          sortFn: byRow((a, b) => compareNumbers(a.firstPublishTime, b.firstPublishTime))
        },
        lastMessage: {
          title: 'Last message',
          render: (row) => (row.unavailableReason !== undefined ? noValue : mono(row.lastMessageId)),
          sortFn: byRow((a, b) => (a.lastMessageId ?? '').localeCompare(b.lastMessageId ?? ''))
        },
        lastPublished: {
          title: 'Last published',
          render: (row) => (row.unavailableReason !== undefined ? noValue : formatTimestamp(row.lastPublishTime)),
          sortFn: byRow((a, b) => compareNumbers(a.lastPublishTime, b.lastPublishTime))
        },
        cursorMessage: {
          title: 'Message under cursor',
          render: (row) => (row.unavailableReason !== undefined ? noValue : mono(row.cursorMessageId)),
          sortFn: byRow((a, b) => (a.cursorMessageId ?? '').localeCompare(b.cursorMessageId ?? ''))
        },
        behind: {
          title: 'Behind',
          render: (row) => (row.unavailableReason !== undefined ? noValue : formatDurationMs(behindMsOf(row))),
          sortFn: byRow((a, b) => compareNumbers(behindMsOf(a), behindMsOf(b)))
        },
        timeFraction: {
          title: '% of time range',
          render: (row) => (row.unavailableReason !== undefined ? noValue : formatFraction(row.cursorTimeFraction)),
          sortFn: byRow((a, b) => compareNumbers(a.cursorTimeFraction, b.cursorTimeFraction))
        },
        entryFraction: {
          title: '% of entries',
          render: (row) => (row.unavailableReason !== undefined ? noValue : formatFraction(row.cursorEntryFraction)),
          sortFn: byRow((a, b) => compareNumbers(a.cursorEntryFraction, b.cursorEntryFraction))
        },
        entriesRead: {
          title: 'Entries read',
          render: (row) => (row.unavailableReason !== undefined ? noValue : formatEntryCount(row.cursorEntryOrdinal, row.retainedEntries)),
          sortFn: byRow((a, b) => compareNumbers(a.cursorEntryOrdinal, b.cursorEntryOrdinal))
        },
        entriesLeft: {
          title: 'Entries left',
          render: (row) =>
            row.unavailableReason !== undefined || row.cursorEntryOrdinal === undefined || row.retainedEntries === undefined
              ? noValue
              : (row.retainedEntries - row.cursorEntryOrdinal).toLocaleString(),
          sortFn: byRow((a, b) =>
            compareNumbers(
              a.cursorEntryOrdinal !== undefined && a.retainedEntries !== undefined ? a.retainedEntries - a.cursorEntryOrdinal : undefined,
              b.cursorEntryOrdinal !== undefined && b.retainedEntries !== undefined ? b.retainedEntries - b.cursorEntryOrdinal : undefined
            )
          )
        }
      },
      help: {
        behind: (
          <span>
            How far the session's read position trails the newest message, in wall-clock time - the consumer-lag
            clock. Large means lagging; small on a quiet topic just means no traffic.
          </span>
        ),
        timeFraction: <span>Where the cursor sits between the first and last publish times.</span>,
        entryFraction: (
          <span>
            The share of STORED ENTRIES already consumed. A batched entry holds many messages, so this tracks
            message count only as closely as batch sizes stayed uniform.
          </span>
        )
      }
    };
  }, []);

  return (
    <div className={s.TopicPositions} data-testid="topic-positions">
      {!isSessionStarted && (
        <div className={s.Empty} data-testid="topic-positions-not-started">
          Start the session to see where each topic begins and ends, and how far it has read.
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
