import React from 'react';
import s from './SubscriptionCursor.module.css';

export type SubscriptionCursorProps = {
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
  console.log('cursor!!!');
  return (
    <div className={s.SubscriptionCursor}>
      cursor
    </div>
  );
}

export default SubscriptionCursor;
