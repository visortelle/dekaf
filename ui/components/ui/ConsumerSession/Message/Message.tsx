import React from 'react';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { SessionContextStateJsonField, BrokerPublishTimeField, EventTimeField, ValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField, SessionTargetIndexField } from './fields';
import s from './Message.module.css';
import { ConsumerSessionConfig, MessageDescriptor } from '../types';
import MessageDetails from './MessageDetails/MessageDetails';
import { Coloring } from '../coloring';
import { getValueProjectionTds, ValueProjectionTh } from '../value-projections/value-projections-utils';
import { Td } from './Td';

export type MessageProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor;
  coloring: Coloring;
  sessionConfig: ConsumerSessionConfig;
  valueProjectionThs: ValueProjectionTh[]
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const msg = props.message;
  const modals = Modals.useContext();

  const showMessageDetails = () => modals.push({
    id: 'message-details',
    title: `Message details`,
    content: <MessageDetails message={props.message} />,
    styleMode: 'no-content-padding'
  });

  return (
    <>
      <Td
        key="index"
        width="36rem"
        className={s.IndexField}
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        {props.message.index}
      </Td>

      <Td
        key="publishTime"
        width="200rem"
        className={s.PublishTimeField}
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      <Td
        key="key"
        width='20ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      {getValueProjectionTds({
        sessionConfig: props.sessionConfig,
        valueProjectionThs: props.valueProjectionThs,
        coloring: props.coloring,
        message: props.message
      })}

      <Td
        key="value"
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sessionTargetIndex"
        width='5ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SessionTargetIndexField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="topic"
        width='60ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="producerName"
        width='50ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="schemaVersion"
        width='8ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="size"
        width='12ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="properties"
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="eventTime"
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="brokerPublishTime"
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="message"
        width='40ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sequence"
        width='10ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="ordering"
        width='10ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="redeliveryCount"
        width='10ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        key="sessionContextState"
        width='50ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SessionContextStateJsonField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
    </>
  );
}

export default MessageComponent;
