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

  return (
    <>
      <Td
        key="index"
        testId="cs-message"
        width="36rem"
        className={s.IndexField}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        {props.message.displayIndex}
      </Td>

      <Td
        key="publishTime"
        width={`${props.getColumnWidth('publishTime')}px`}
        className={s.PublishTimeField}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      <Td
        key="key"
        width={`${props.getColumnWidth('key')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      {getValueProjectionTds({
        sessionConfig: props.sessionConfig,
        valueProjectionThs: props.valueProjectionThs,
        coloring: props.coloring,
        message: props.message,
        isSelected
      })}

      <Td
        key="value"
        testId="cs-message-value"
        width={`${props.getColumnWidth('value')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sessionTargetIndex"
        width={`${props.getColumnWidth('sessionTargetIndex')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SessionTargetIndexField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="topic"
        width={`${props.getColumnWidth('topic')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="producerName"
        width={`${props.getColumnWidth('producerName')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="schemaVersion"
        width={`${props.getColumnWidth('schemaVersion')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="size"
        width={`${props.getColumnWidth('size')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="properties"
        width={`${props.getColumnWidth('properties')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="eventTime"
        width={`${props.getColumnWidth('eventTime')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="brokerPublishTime"
        width={`${props.getColumnWidth('brokerPublishTime')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="message"
        width={`${props.getColumnWidth('messageId')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sequence"
        width={`${props.getColumnWidth('sequenceId')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="ordering"
        width={`${props.getColumnWidth('orderingKey')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="redeliveryCount"
        width={`${props.getColumnWidth('redeliveryCount')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sessionContextState"
        width={`${props.getColumnWidth('sessionContextState')}px`}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SessionContextStateJsonField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
    </>
  );
}

export default MessageComponent;
