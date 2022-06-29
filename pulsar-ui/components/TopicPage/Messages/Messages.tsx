import React from 'react';
import s from './Messages.module.css'

export type MessagesProps = {
  tenant: string,
  namespace: string,
  topicType: 'persistent' | 'non-persistent',
  topic: string,
};

const Messages: React.FC<MessagesProps> = (props) => {
  return (
    <div className={s.Messages}>messages</div>
  );
}

export default Messages;
