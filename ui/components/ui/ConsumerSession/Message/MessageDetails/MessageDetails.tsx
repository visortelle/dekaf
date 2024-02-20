import React, { ReactElement, ReactNode, useState } from 'react';
import s from './MessageDetails.module.css'
import { MessageDescriptor } from '../../types';
import JsonView from '../../../JsonView/JsonView';
import { SessionContextStateJsonField, BrokerPublishTimeField, EventTimeField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField } from '../fields';
import { renderToStaticMarkup } from 'react-dom/server';
import { tooltipId } from '../../../Tooltip/Tooltip';
import { help } from '../fields';
import Tabs from '../../../Tabs/Tabs';
import NoData from '../../../NoData/NoData';
import KeyValueEditor, { recordToIndexedKv } from '../../../KeyValueEditor/KeyValueEditor';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';

export type MessageDetailsProps = {
  message: MessageDescriptor;
};

type TabKey = 'value' | 'metadata' | 'properties';

const MessageDetails: React.FC<MessageDetailsProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('value');

  const keyField = <Field title={'Key'} value={<KeyField isShowTooltips={true} message={props.message} />} help={help.key} />

  const propertiesCount = Object.keys(props.message.properties || {}).length;
  const propertiesFieldTitle = <span style={{ display: 'inline-flex', gap: '1ch' }}>Properties {propertiesCount === 0 ? <NoData /> : <strong>{propertiesCount}</strong>}</span>;

  return (
    <div className={s.MessageDetails}>
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        tabs={[
          {
            key: 'value',
            title: 'Value',
            render: () => {
              return (
                <div className={s.TabContent}>
                  {keyField}
                  <Field
                    title='Value'
                    value={(
                      <JsonView
                        json={props.message.value === null ? undefined : props.message.value}
                        width="auto"
                        height="480rem"
                      />
                    )}
                    help={help.value}
                  />
                </div>
              );
            }
          },
          {
            key: 'metadata',
            title: 'Metadata',
            render: () => {
              return (
                <div className={s.TabContent}>
                  {keyField}
                  <Field title={'Publish time'} value={<PublishTimeField isShowTooltips={true} message={props.message} />} help={help.publishTime} />
                  <Field title={'Topic'} value={<TopicField isShowTooltips={true} message={props.message} />} help={help.topic} />
                  <Field title={'Producer'} value={<ProducerNameField isShowTooltips={true} message={props.message} />} help={help.producerName} />
                  <Field title={'Schema version'} value={<SchemaVersionField isShowTooltips={true} message={props.message} />} help={help.schemaVersion} />
                  <Field title={'Size'} value={<SizeField isShowTooltips={true} message={props.message} />} help={help.size} />
                  <Field title={'Event time'} value={<EventTimeField isShowTooltips={true} message={props.message} />} help={help.eventTime} />
                  <Field title={'Broker pub. time'} value={<BrokerPublishTimeField isShowTooltips={true} message={props.message} />} help={help.brokerPublishTime} />
                  <Field title={'Message Id'} value={<MessageIdField isShowTooltips={true} message={props.message} />} help={help.messageId} />
                  <Field title={'Sequence Id'} value={<SequenceIdField isShowTooltips={true} message={props.message} />} help={help.sequenceId} />
                  <Field title={'Ordering key'} value={<OrderingKeyField isShowTooltips={true} message={props.message} />} help={help.orderingKey} />
                  <Field title={'Redelivery count'} value={<RedeliveryCountField isShowTooltips={true} message={props.message} />} help={help.redeliveryCount} />
                  <Field title={'Session Context State Json'} value={<SessionContextStateJsonField isShowTooltips={true} message={props.message} />} help={help.sessionContextStateJson} />
                </div>
              );
            }
          },
          {
            key: 'properties',
            title: propertiesFieldTitle,
            render: () => {
              return (
                <div className={s.TabContent}>
                  <FormLabel
                    content="Properties"
                    help={help.propertiesMap}
                  />
                  <div>
                    <KeyValueEditor
                      value={recordToIndexedKv(props.message.properties || {})}
                      onChange={() => { }}
                      mode='readonly'
                      height='480rem'
                    />
                  </div>
                </div>
              );
            }
          }
        ]}
      />
    </div>
  );
}

type FieldProps = {
  title: ReactElement | string;
  value: ReactNode;
  help: ReactElement;
}
const Field: React.FC<FieldProps> = (props) => {
  return (
    <div className={s.Field}>
      {/* TODO - fix tooltips */}
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
