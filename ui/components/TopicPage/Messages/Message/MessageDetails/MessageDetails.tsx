import React, { ReactElement, ReactNode } from 'react';
import s from './MessageDetails.module.css'
import { MessageDescriptor } from '../../types';
import JsonView from '../../../../ui/JsonView/JsonView';
import { AccumulatorField, BrokerPublishTimeField, EventTimeField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField } from '../fields';
import { renderToStaticMarkup } from 'react-dom/server';
import { tooltipId } from '../../../../ui/Tooltip/Tooltip';
import { help } from '../fields';

export type MessageDetailsProps = {
  message: MessageDescriptor;
};

const MessageDetails: React.FC<MessageDetailsProps> = (props) => {
  return (
    <div className={s.MessageDetails}>
      <div className={s.LeftColumn}>
        <Field title={'Publish time'} value={<PublishTimeField isShowTooltips={true} message={props.message} />} help={help.publishTime} />
        <Field title={'Key'} value={<KeyField isShowTooltips={true} message={props.message} />} help={help.key} />
        <Field title={'Topic'} value={<TopicField isShowTooltips={true} message={props.message} />} help={help.topic} />
        <Field title={'Producer'} value={<ProducerNameField isShowTooltips={true} message={props.message} />} help={help.producerName} />
        <Field title={'Schema version'} value={<SchemaVersionField isShowTooltips={true} message={props.message} />} help={help.schemaVersion} />
        <Field title={'Size'} value={<SizeField isShowTooltips={true} message={props.message} />} help={help.size} />
        <Field title={'Properties'} value={<PropertiesField isShowTooltips={true} message={props.message} />} help={help.propertiesMap} />
        <Field title={'Event time'} value={<EventTimeField isShowTooltips={true} message={props.message} />} help={help.eventTime} />
        <Field title={'Broker pub. time'} value={<BrokerPublishTimeField isShowTooltips={true} message={props.message} />} help={help.brokerPublishTime} />
        <Field title={'Message Id'} value={<MessageIdField isShowTooltips={true} message={props.message} />} help={help.messageId} />
        <Field title={'Sequence Id'} value={<SequenceIdField isShowTooltips={true} message={props.message} />} help={help.sequenceId} />
        <Field title={'Ordering key'} value={<OrderingKeyField isShowTooltips={true} message={props.message} />} help={help.orderingKey} />
        <Field title={'Redelivery count'} value={<RedeliveryCountField isShowTooltips={true} message={props.message} />} help={help.redeliveryCount} />
        <Field title={'Accumulator'} value={<AccumulatorField isShowTooltips={true} message={props.message} />} help={help.accumulator} />
      </div>
      <div className={s.RightColumn}>
        <Field
          title='Value'
          value={(
            <JsonView
              json={props.message.value === null ? undefined : JSON.stringify(JSON.parse(props.message.value))}
              width="480rem"
              height="480rem"
            />
          )}
          help={help.value}
        />
      </div>
    </div>
  );
}

type FieldProps = {
  title: string;
  value: ReactNode;
  help: ReactElement;
}
const Field: React.FC<FieldProps> = (props) => {
  return (
    <div className={s.Field}>
      <div
        className={s.FieldTitle}
        data-tooltip-id={tooltipId}
        data-tooltip-html={renderToStaticMarkup(props.help)}
      >
        {props.title}
      </div>
      <div className={s.FieldValue}>{props.value}</div>
    </div>
  )
}

export default MessageDetails;
