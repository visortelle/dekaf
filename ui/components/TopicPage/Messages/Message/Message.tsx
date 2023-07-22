import React from 'react';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { AccumulatorField, BrokerPublishTimeField, EventTimeField, help, ValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField } from './fields';
import s from './Message.module.css';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";
import { MessageDescriptor } from '../types';
import SmallButton from '../../../ui/SmallButton/SmallButton';
import MessageDetails from './MessageDetails/MessageDetails';

export type MessageProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor;
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const msg = props.message;
  const modals = Modals.useContext();

  return (
    <>
      <Td width="35rem" className={s.IndexField}>
        {props.message.index}
      </Td>

      <Td width="200rem" className={s.PublishTimeField}>
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      <Td width="61rem" className={s.ViewMessageDetailsField}>
        <SmallButton
          onClick={() => modals.push({
            id: 'message-details',
            title: `Message details`,
            content: <MessageDetails message={props.message} />,
            styleMode: 'no-content-padding'
          })}
          text="View"
          type='primary'
        />
      </Td>

      <Td width='20ch'>
        <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='30ch'>
        <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='60ch'>
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='50ch'>
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='8ch'>
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='12ch'>
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='30ch'>
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='30ch'>
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='30ch'>
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='40ch'>
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='10ch'>
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='10ch'>
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='10ch'>
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='50ch'>
        <AccumulatorField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
    </>
  );
}

type TdProps = { children: React.ReactNode, width?: string } & React.ThHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = (props) => {
  const { children, className, width, ...restProps } = props;
  return <td className={`${cts.Td} ${className || ''}`} {...restProps}>
    <div style={{ width, textOverflow: 'ellipsis', display: 'flex' }} >
      {children}
    </div>
  </td>;
};

export default MessageComponent;
