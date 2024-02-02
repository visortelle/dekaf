import React from 'react';
import { SessionContextStateJsonField, BrokerPublishTimeField, EventTimeField, ValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField, SessionTargetIndexField } from './fields';
import s from './Message.module.css';
import { ConsumerSessionConfig, MessageDescriptor, SessionState } from '../types';
import { Coloring } from '../coloring';
import { getValueProjectionTds, ValueProjectionTh } from '../value-projections/value-projections-utils';
import { Td } from './Td';

export type MessageProps = {
  isShowTooltips: boolean;
  selectedMessages: number[];
  message: MessageDescriptor;
  sessionState: SessionState;
  coloring: Coloring;
  sessionConfig: ConsumerSessionConfig;
  valueProjectionThs: ValueProjectionTh[],
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
        width="180rem"
        className={s.PublishTimeField}
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      <Td
        key="key"
        width='20ch'
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
        width='30ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sessionTargetIndex"
        width='5ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SessionTargetIndexField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="topic"
        width='60ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="producerName"
        width='50ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="schemaVersion"
        width='8ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="size"
        width='12ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="properties"
        width='30ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="eventTime"
        width='30ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="brokerPublishTime"
        width='30ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="message"
        width='40ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sequence"
        width='10ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="ordering"
        width='10ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="redeliveryCount"
        width='10ch'
        onClick={onClick}
        coloring={props.coloring}
        isSelected={isSelected}
      >
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sessionContextState"
        width='50ch'
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
