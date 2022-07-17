import React from 'react';
import s from './SubscriptionCursor.module.css';

type LedgerInfo = {
  ledgerId: number;
  entries: number;
  size: number;
  offloaded: boolean;
  metadata: string;
  underReplicated: boolean;
}

export type SubscriptionCursorProps = {
  managedLedgerInternalStats: {
    entriesAddedCounter: number;
    numberOfEntries: number;
    totalSize: number;
    currentLedgerEntries: number;
    currentLedgerSize: number;
    lastLedgerCreatedTimestamp: string;
    lastLedgerCreationFailureTimestamp: string;
    waitingCursorsCount: number;
    pendingEntriesCount: number;
    lastConfirmedEntry: string;
    state: string;
    ledgers: LedgerInfo[];
  },
  cursor: {
    markDeletePosition: string;
    readPosition: string,
    waitingReadOp: boolean;
    pendingReadOps: number;
    messagesConsumedCounter: number;
    cursorLedger: number;
    cursorLedgerLastEntry: number;
    individuallyDeletedMessages: string;
    lastLedgerSwitchTimestamp: string;
    state: string;
    numberOfEntriesSinceFirstNotAckedMessage: number;
    totalNonContiguousDeletedMessagesRange: number;
    subscriptionHavePendingRead: boolean;
    subscriptionHavePendingReplayRead: boolean;
    properties: Record<string, number>;
  }
}

const SubscriptionCursor: React.FC<SubscriptionCursorProps> = (props) => {
  const numberOfEntries = props.managedLedgerInternalStats.numberOfEntries;
  const readPosition = Number(props.cursor.readPosition.split(':')[1]);
  const readPositionPercent = readPosition / (numberOfEntries / 100);
  const markDeletePosition = Number(props.cursor.markDeletePosition.split(':')[1]);
  const markDeletePositionPercent = markDeletePosition / (numberOfEntries / 100);

  return (
    <div className={s.SubscriptionCursor}>
      <div className={s.Bar}>
        <div className={s.ReadPosition} style={{ left: `${readPositionPercent}%` }} data-tip="Read position">
          <div className={s.ReadPositionValue} style={{ left: readPositionPercent < 50 ? 0 : 'unset' }}>{readPosition}</div>
        </div>
        <div className={s.MarkDeletePosition} style={{ left: `${markDeletePositionPercent}%` }} data-tip="Mark-delete position">
          <div className={s.MarkDeletePositionValue} style={{ left: markDeletePositionPercent < 50 ? 0 : 'unset' }}>{markDeletePosition}</div>
        </div>
        <div className={s.NumberOfEntries} data-tip="Number of entries">{numberOfEntries}</div>
      </div>
    </div>
  );
}

export default SubscriptionCursor;
