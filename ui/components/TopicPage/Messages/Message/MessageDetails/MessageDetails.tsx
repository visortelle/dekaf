import React, { ReactNode, useEffect } from 'react';
import s from './MessageDetails.module.css'
import { MessageDescriptor } from '../../types';
import JsonView from '../../../../ui/JsonView/JsonView';
import { AccumulatorField, BrokerPublishTimeField, EventTimeField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField } from '../fields';
import ReactTooltip from 'react-tooltip';

export type MessageDetailsProps = {
  message: MessageDescriptor;
  topicHref?: string;
};

const MessageDetails: React.FC<MessageDetailsProps> = (props) => {
  useEffect(() => {
    ReactTooltip.rebuild();
  }, []);

  return (
    <div className={s.MessageDetails}>
      <div className={s.LeftColumn}>
        <Field title={'Publish time'} value={<PublishTimeField isShowTooltips={true} message={props.message} />} />
        <Field title={'Key'} value={<KeyField isShowTooltips={true} message={props.message} />} />
        <Field title={'Topic'} value={<TopicField isShowTooltips={true} message={props.message} topicHref={props.topicHref} />} />
        <Field title={'Producer'} value={<ProducerNameField isShowTooltips={true} message={props.message} />} />
        <Field title={'Schema version'} value={<SchemaVersionField isShowTooltips={true} message={props.message} />} />
        <Field title={'Size'} value={<SizeField isShowTooltips={true} message={props.message} />} />
        <Field title={'Properties'} value={<PropertiesField isShowTooltips={true} message={props.message} />} />
        <Field title={'Event time'} value={<EventTimeField isShowTooltips={true} message={props.message} />} />
        <Field title={'Broker pub. time'} value={<BrokerPublishTimeField isShowTooltips={true} message={props.message} />} />
        <Field title={'Message Id'} value={<MessageIdField isShowTooltips={true} message={props.message} />} />
        <Field title={'Sequence Id'} value={<SequenceIdField isShowTooltips={true} message={props.message} />} />
        <Field title={'Ordering key'} value={<OrderingKeyField isShowTooltips={true} message={props.message} />} />
        <Field title={'Redelivery count'} value={<RedeliveryCountField isShowTooltips={true} message={props.message} />} />
        <Field title={'Aggregate'} value={<AccumulatorField isShowTooltips={true} message={props.message} />} />
      </div>
      <div className={s.RightColumn}>
        <Field
          title='Value as JSON'
          value={<JsonView json={props.message.value === null ? undefined : props.message.value} width="480rem" height="480rem" />}
        />
      </div>
    </div>
  );
}

type FieldProps = {
  title: string;
  value: ReactNode;
}
const Field: React.FC<FieldProps> = (props) => {
  return (
    <div className={s.Field}>
      <div className={s.FieldTitle}>{props.title}</div>
      <div className={s.FieldValue}>{props.value}</div>
    </div>
  )
}

export default MessageDetails;
