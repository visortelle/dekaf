import React from 'react';
import s from './MessageRoutingMode.module.css'
import { MessageRoutingMode } from '../message-routing-mode';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../Select/Select';

export type MessageRoutingModeProps = {
  value: MessageRoutingMode,
  onChange: (v: MessageRoutingMode) => void
};

const MessageRoutingMode: React.FC<MessageRoutingModeProps> = (props) => {
  return (
    <div className={s.MessageRoutingMode}>
      <FormItem>
        <FormLabel content="Message Routing Mode" />
        <Select<MessageRoutingMode>
          size='small'
          value={props.value}
          onChange={props.onChange}
          list={[
            { type: 'item', title: 'Round Robin', value: 'round-robin-partition' },
            { type: 'item', title: 'Custom Partition', value: 'custom-partition' },
            { type: 'item', title: 'Single Partition', value: 'single-partition' },
          ]}

        />
      </FormItem>
    </div>
  );
}

export default MessageRoutingMode;
