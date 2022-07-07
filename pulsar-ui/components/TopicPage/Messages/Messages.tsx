import React, { useEffect } from 'react';
import s from './Messages.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { ReadMessagesRequest } from '../../../grpc-web/api/v1/topic_pb';

export type MessagesProps = {
  tenant: string,
  namespace: string,
  topicType: 'persistent' | 'non-persistent',
  topic: string,
};

const Messages: React.FC<MessagesProps> = (props) => {
  const { topicServiceClient } = PulsarGrpcClient.useContext();
  const [messages, setMessages] = React.useState<string[]>([]);

  useEffect(() => {
    const req = new ReadMessagesRequest();
    req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);

    const stream = topicServiceClient.readMessages(req)
    stream.on('data', (data) => console.log('data:', data))
  }, []);

  return (
    <div className={s.Messages}>messages</div>
  );
}

export default Messages;
