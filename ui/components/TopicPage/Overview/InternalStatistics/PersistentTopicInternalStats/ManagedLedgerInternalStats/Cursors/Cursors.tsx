import * as I18n from '../../../../../../app/contexts/I18n/I18n';
import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { useMemo } from 'react';
import Table from '../../../../../../ui/Table/Table';
import * as pbUtils from '../../../../../../../pbUtils/pbUtils';
import { routes } from '../../../../../../routes';
import Link from '../../../../../../ui/Link/Link';
import { PulsarTopicPersistency } from '../../../../../../pulsar/pulsar-resources';

type CursorsColumnKey =
  "subscriptionName" |
  "markDeletePosition" |
  "readPosition" |
  "waitingReadOp" |
  "pendingReadOps" |
  "messagesConsumedCounter" |
  "cursorLedger" |
  "cursorLedgerLastEntry" |
  "individuallyDeletedMessages" |
  "lastLedgerSwitchTimestamp" |
  "state" |
  "active" |
  "numberOfEntriesSinceFirstNotAckedMessage" |
  "totalNonContiguousDeletedMessagesRange" |
  "subscriptionHavePendingRead" |
  "subscriptionHavePendingReplayRead" |
  "properties";

type CursorStats = {
  subscriptionName: string;
  markDeletePosition?: string;
  readPosition?: string;
  waitingReadOp?: boolean;
  pendingReadOps?: number;
  messagesConsumedCounter?: number;
  cursorLedger?: number;
  cursorLedgerLastEntry?: number;
  individuallyDeletedMessages?: string;
  lastLedgerSwitchTimestamp?: Date;
  state?: string;
  active?: boolean;
  numberOfEntriesSinceFirstNotAckedMessage?: number;
  totalNonContiguousDeletedMessagesRange?: number;
  subscriptionHavePendingRead?: boolean;
  subscriptionHavePendingReplayRead?: boolean;
  properties?: Record<string, number>;
};

function cursorStatsFromPb(subscriptionName: string, stats: pb.CursorStats): CursorStats {
  const lastLedgerSwitchTimestamp = stats.getLastLedgerSwitchTimestamp()?.getValue();

  return {
    subscriptionName,
    markDeletePosition: stats.getMarkDeletePosition()?.getValue(),
    readPosition: stats.getReadPosition()?.getValue(),
    waitingReadOp: stats.getWaitingReadOp()?.getValue(),
    pendingReadOps: stats.getPendingReadOps()?.getValue(),
    messagesConsumedCounter: stats.getMessagesConsumedCounter()?.getValue(),
    cursorLedger: stats.getCursorLedger()?.getValue(),
    cursorLedgerLastEntry: stats.getCursorLedgerLastEntry()?.getValue(),
    individuallyDeletedMessages: stats.getIndividuallyDeletedMessages()?.getValue(),
    lastLedgerSwitchTimestamp: lastLedgerSwitchTimestamp === undefined ? undefined : new Date(lastLedgerSwitchTimestamp),
    state: stats.getState()?.getValue(),
    active: stats.getActive()?.getValue(),
    numberOfEntriesSinceFirstNotAckedMessage: stats.getNumberOfEntriesSinceFirstNotAckedMessage()?.getValue(),
    totalNonContiguousDeletedMessagesRange: stats.getTotalNonContiguousDeletedMessagesRange()?.getValue(),
    subscriptionHavePendingRead: stats.getSubscriptionHavePendingRead()?.getValue(),
    subscriptionHavePendingReplayRead: stats.getSubscriptionHavePendingReplayRead()?.getValue(),
    properties: pbUtils.mapToObject(stats.getPropertiesMap()),
  };
}

export type CursorsProps = {
  cursors: Record<string, pb.CursorStats>,
  tenant: string,
  namespace: string,
  topic: string,
  topicPersistency: PulsarTopicPersistency,
};

const Cursors: React.FC<CursorsProps> = (props) => {
  const i18n = I18n.useContext();

  const cursors = useMemo(() => {
    return Object.entries(props.cursors).map(([subscriptionName, stats]) => cursorStatsFromPb(subscriptionName, stats))
  }, [props.cursors]);

  return (
    <Table<CursorsColumnKey, CursorStats, {}>
      autoRefresh={{ intervalMs: 100 }}
      toolbar={{ visibility: 'hidden' }}
      columns={{
        columns: {
          subscriptionName: {
            title: "Subscription",
            render: (cursor) => i18n.withVoidDefault(cursor.subscriptionName, v => (
              <Link
                to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.overview._.get({
                  tenant: props.tenant,
                  namespace: props.namespace,
                  topic: props.topic,
                  topicPersistency: props.topicPersistency,
                  subscription: v,
                })}
              >
                {v}
              </Link>
            )),
            sortFn: (a, b) => a.data.subscriptionName.localeCompare(b.data.subscriptionName, 'en', { numeric: true }),
            filter: {
              descriptor: {
                type: 'string',
                defaultValue: { type: 'string', value: '' }
              },
              testFn: (cursor, _, filter) => {
                if (filter.type !== 'string') {
                  return true;
                }

                return cursor.subscriptionName.toLowerCase().includes(filter.value.toLowerCase());
              },
            }
          },
          markDeletePosition: {
            title: "Mark Delete Position",
            render: (cursor) => i18n.withVoidDefault(cursor.markDeletePosition, v => v),
            sortFn: (a, b) => (a.data.markDeletePosition || '').localeCompare(b.data.markDeletePosition || '', 'en', { numeric: true }),
          },
          readPosition: {
            title: "Read Position",
            render: (cursor) => i18n.withVoidDefault(cursor.readPosition, v => v),
            sortFn: (a, b) => (a.data.readPosition || '').localeCompare(b.data.readPosition || '', 'en', { numeric: true }),
          },
          waitingReadOp: {
            title: "Waiting Read Op",
            render: (cursor) => i18n.withVoidDefault(cursor.waitingReadOp, i18n.formatBoolean),
            sortFn: (a, b) => Number(a.data.waitingReadOp) - Number(b.data.waitingReadOp),
          },
          pendingReadOps: {
            title: "Pending Read Ops",
            render: (cursor) => i18n.withVoidDefault(cursor.pendingReadOps, i18n.formatCount),
            sortFn: (a, b) => (a.data.pendingReadOps || 0) - (b.data.pendingReadOps || 0),
          },
          messagesConsumedCounter: {
            title: "Messages Consumed Counter",
            render: (cursor) => i18n.withVoidDefault(cursor.messagesConsumedCounter, i18n.formatCount),
            sortFn: (a, b) => (a.data.messagesConsumedCounter || 0) - (b.data.messagesConsumedCounter || 0),
          },
          cursorLedger: {
            title: "Cursor Ledger",
            render: (cursor) => i18n.withVoidDefault(cursor.cursorLedger, v => v),
            sortFn: (a, b) => (a.data.cursorLedger || 0) - (b.data.cursorLedger || 0),
          },
          cursorLedgerLastEntry: {
            title: "Cursor Ledger Last Entry",
            render: (cursor) => i18n.withVoidDefault(cursor.cursorLedgerLastEntry, v => v),
            sortFn: (a, b) => (a.data.cursorLedgerLastEntry || 0) - (b.data.cursorLedgerLastEntry || 0),
          },
          individuallyDeletedMessages: {
            title: "Individually Deleted Messages",
            render: (cursor) => i18n.withVoidDefault(cursor.individuallyDeletedMessages, v => v),
            sortFn: (a, b) => (a.data.individuallyDeletedMessages || '').localeCompare(b.data.individuallyDeletedMessages || '', 'en', { numeric: true }),
          },
          lastLedgerSwitchTimestamp: {
            title: "Last Ledger Switch",
            render: (cursor) => i18n.withVoidDefault(cursor.lastLedgerSwitchTimestamp, i18n.formatDateTime),
            sortFn: (a, b) => (a.data.lastLedgerSwitchTimestamp?.getTime() || 0) - (b.data.lastLedgerSwitchTimestamp?.getTime() || 0),
          },
          state: {
            title: "State",
            render: (cursor) => i18n.withVoidDefault(cursor.state, v => v),
            sortFn: (a, b) => (a.data.state || '').localeCompare(b.data.state || '', 'en', { numeric: true }),
          },
          active: {
            title: "Active",
            render: (cursor) => i18n.withVoidDefault(cursor.active, i18n.formatBoolean),
            sortFn: (a, b) => Number(a.data.active) - Number(b.data.active),
          },
          numberOfEntriesSinceFirstNotAckedMessage: {
            title: "Number Of Entries Since First Not Acked Message",
            render: (cursor) => i18n.withVoidDefault(cursor.numberOfEntriesSinceFirstNotAckedMessage, i18n.formatCount),
            sortFn: (a, b) => (a.data.numberOfEntriesSinceFirstNotAckedMessage || 0) - (b.data.numberOfEntriesSinceFirstNotAckedMessage || 0),
          },
          totalNonContiguousDeletedMessagesRange: {
            title: "Total Non Contiguous Deleted Messages Range",
            render: (cursor) => i18n.withVoidDefault(cursor.totalNonContiguousDeletedMessagesRange, v => v),
            sortFn: (a, b) => (a.data.totalNonContiguousDeletedMessagesRange || 0) - (b.data.totalNonContiguousDeletedMessagesRange || 0),
          },
          subscriptionHavePendingRead: {
            title: "Subscription Have Pending Read",
            render: (cursor) => i18n.withVoidDefault(cursor.subscriptionHavePendingRead, i18n.formatBoolean),
            sortFn: (a, b) => Number(a.data.subscriptionHavePendingRead) - Number(b.data.subscriptionHavePendingRead),
          },
          subscriptionHavePendingReplayRead: {
            title: "Subscription Have Pending Replay Read",
            render: (cursor) => i18n.withVoidDefault(cursor.subscriptionHavePendingReplayRead, i18n.formatBoolean),
            sortFn: (a, b) => Number(a.data.subscriptionHavePendingReplayRead) - Number(b.data.subscriptionHavePendingReplayRead),
          },
          properties: {
            title: "Properties",
            render: (cursor) => i18n.withVoidDefault(cursor.properties, v => JSON.stringify(v, null, 4)),
            sortFn: (a, b) => (JSON.stringify(a.data.properties) || '').localeCompare(JSON.stringify(b.data.properties) || '', 'en', { numeric: true }),
          }
        },
        defaultConfig: [
          { columnKey: "subscriptionName", width: 200, visibility: 'visible', stickyTo: 'left' },
          { columnKey: "readPosition", width: 100, visibility: 'visible' },
          { columnKey: "markDeletePosition", width: 100, visibility: 'visible' },
          { columnKey: "waitingReadOp", width: 100, visibility: 'visible' },
          { columnKey: "pendingReadOps", width: 100, visibility: 'visible' },
          { columnKey: "messagesConsumedCounter", width: 100, visibility: 'visible' },
          { columnKey: "cursorLedger", width: 100, visibility: 'visible' },
          { columnKey: "cursorLedgerLastEntry", width: 100, visibility: 'visible' },
          { columnKey: "state", width: 100, visibility: 'visible' },
          { columnKey: "active", width: 100, visibility: 'visible' },
          { columnKey: "numberOfEntriesSinceFirstNotAckedMessage", width: 100, visibility: 'visible' },
          { columnKey: "totalNonContiguousDeletedMessagesRange", width: 100, visibility: 'visible' },
          { columnKey: "subscriptionHavePendingRead", width: 100, visibility: 'visible' },
          { columnKey: "subscriptionHavePendingReplayRead", width: 100, visibility: 'visible' },
          { columnKey: "lastLedgerSwitchTimestamp", width: 180, visibility: 'visible' },
          { columnKey: "properties", width: 300, visibility: 'visible' },
          { columnKey: "individuallyDeletedMessages", width: 400, visibility: 'visible' },
        ]
      }}
      dataLoader={{
        cacheKey: cursors.map(cursor => cursor.subscriptionName),
        loader: async () => cursors,
      }}
      getId={(cursor) => cursor.subscriptionName}
      tableId='cursors-table'
      defaultSort={{ column: "subscriptionName", direction: 'asc', type: 'by-single-column' }}
    />
  );
}

export default Cursors;
