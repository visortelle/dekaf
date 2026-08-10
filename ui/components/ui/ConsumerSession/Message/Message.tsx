import React from 'react';
import { SessionContextStateJsonField, BrokerPublishTimeField, EventTimeField, ValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField, SessionTargetIndexField } from './fields';
import s from './Message.module.css';
import { ConsumerSessionConfig, MessageDescriptor, SessionState } from '../types';
import { Coloring } from '../coloring';
import { getValueProjectionTds, ValueProjectionTh } from '../value-projections/value-projections-utils';
import { Td } from './Td';
import { MessageColumnKey } from '../message-columns';

export type MessageProps = {
  isShowTooltips: boolean;
  selectedMessages: number[];
  message: MessageDescriptor;
  sessionState: SessionState;
  coloring: Coloring;
  sessionConfig: ConsumerSessionConfig;
  valueProjectionThs: ValueProjectionTh[],
  getColumnWidth: (key: MessageColumnKey) => number,
  /** The reorderable columns in render order (index and publishTime stay fixed in front). */
  columnOrder: MessageColumnKey[],
  /** This row is the first one delivered after the delivery-order switch (the caught-up banner's
   * "Continue live with Best effort"): rows above it are the exact replay, rows below follow live
   * traffic in the bounded reorder window. The row carries the divider band that says so. */
  isOrderSwitchBoundary?: boolean,
  onClick: React.MouseEventHandler<HTMLTableCellElement>
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const msg = props.message;
  const onClick: React.MouseEventHandler<HTMLTableCellElement> = (event) => {
    props.onClick(event);
  }

  const isSelected = (props.sessionState === 'running' || props.message.numMessageProcessed === null) ?
    false :
    props.selectedMessages.includes(props.message.numMessageProcessed);

  // One cell per reorderable column, keyed exactly like the header - the row follows whatever
  // order the header is dragged into.
  const fieldContent: Record<MessageColumnKey, React.ReactNode> = {
    publishTime: <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />,
    key: <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />,
    value: <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />,
    sessionTargetIndex: <SessionTargetIndexField isShowTooltips={props.isShowTooltips} message={props.message} />,
    topic: <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />,
    producerName: <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />,
    schemaVersion: <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />,
    size: <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />,
    properties: <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />,
    eventTime: <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />,
    brokerPublishTime: <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />,
    messageId: <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />,
    sequenceId: <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />,
    orderingKey: <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />,
    redeliveryCount: <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />,
    sessionContextState: <SessionContextStateJsonField isShowTooltips={props.isShowTooltips} message={props.message} />,
  };

  // The divider band rides every cell of the boundary row, so the line spans the table wherever
  // it is scrolled to; the labeled badge itself sits on the sticky publish-time cell.
  const boundaryClass = props.isOrderSwitchBoundary ? s.OrderSwitchBoundaryTd : '';

  const fieldTd = (columnKey: MessageColumnKey) => (
    <Td
      key={columnKey}
      testId={columnKey === 'value' ? 'cs-message-value' : undefined}
      width={`${props.getColumnWidth(columnKey)}px`}
      className={boundaryClass}
      onClick={onClick}
      coloring={props.coloring}
      isSelected={isSelected}
    >
      {fieldContent[columnKey]}
    </Td>
  );

  return (
    <>
      <Td
        key="index"
        testId="cs-message"
        width="36rem"
        className={`${s.IndexField} ${boundaryClass}`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        {props.message.displayIndex}
        {/* The guaranteed replay delivered this row out of order - loudly flagged, never
            silently (the session chip carries the running count). */}
        {props.message.replaySeamViolation && (
          <span
            className={s.SeamViolationMarker}
            data-testid="cs-seam-violation-marker"
            title="Arrived out of order: a producer clock wrote an earlier timestamp into the pause window, or the source log itself stores an inversion."
          >
            !
          </span>
        )}
      </Td>

      <Td
        key="publishTime"
        width={`${props.getColumnWidth('publishTime')}px`}
        className={`${s.PublishTimeField} ${boundaryClass}`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        {props.isOrderSwitchBoundary && (
          <span
            className={s.OrderSwitchPointBadge}
            data-testid="cs-order-switch-point"
            title={
              'The delivery order switched to Best effort at this point. Rows above are the exact replay of ' +
              'recorded history; rows below follow live traffic within the bounded reorder window.'
            }
          >
            Best effort from here
          </span>
        )}
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      {props.columnOrder.flatMap((columnKey) => {
        const cells = [fieldTd(columnKey)];
        // Value-projection columns are glued after the KEY column wherever it sits - the same
        // neighbourhood they have always rendered in, whatever order the rest takes.
        if (columnKey === 'key') {
          cells.push(...getValueProjectionTds({
            sessionConfig: props.sessionConfig,
            valueProjectionThs: props.valueProjectionThs,
            coloring: props.coloring,
            message: props.message,
            isSelected
          }));
        }
        return cells;
      })}
    </>
  );
}

export default MessageComponent;
