import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import {
  Message,
  CreateConsumerRequest,
  ResumeRequest,
  ResumeResponse,
  SubscriptionType,
  TopicSelector,
  DeleteConsumerRequest,
  PauseRequest,
  SubscriptionInitialPosition,
  DeleteSubscriptionRequest,
  SeekRequest
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { ItemContent, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar';
import { isEqual } from 'lodash';
import { SessionState, SessionConfig } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';

export type MessagesProps = {
  tenant: string,
  namespace: string,
  topicType: 'persistent' | 'non-persistent',
  topic: string,
};

type KeyedMessage = {
  message: Message,
  key: string
}

type Content = 'messages' | 'configuration';

const displayMessagesLimit = 10000;

const Messages: React.FC<MessagesProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [sessionState, setSessionState] = useState<SessionState>('new');
  const prevSessionState = usePrevious(sessionState);
  const [sessionStateBeforeWindowBlur, setSessionStateBeforeWindowBlur] = useState(sessionState);
  const [consumerName, setConsumerName] = useState('__xray_' + nanoid());
  const [subscriptionName, setSubscriptionName] = useState('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();
  const streamRef = useRef<ClientReadableStream<ResumeResponse>>();
  const [messagesLoaded, setMessagesLoaded] = useState(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<{ prevMessagesLoaded: number, messagesLoadedPerSecond: number }>({ prevMessagesLoaded: 0, messagesLoadedPerSecond: 0 });
  const messagesBuffer = useRef<KeyedMessage[]>([]);
  const [config, setConfig] = useState<SessionConfig>({ startFrom: { type: 'latest' } });
  const [messages, setMessages] = useState<KeyedMessage[]>([]);

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prevMessagesLoaded: messagesLoaded, messagesLoadedPerSecond: sessionState === 'running' ? messagesLoaded - messagesLoadedPerSecond.prevMessagesLoaded : 0 }));
  }, sessionState === 'running' ? 1000 : false);
  useInterval(() => virtuosoRef.current?.scrollToIndex(messages.length - 1), sessionState === 'running' ? 300 : false); // Virtuoso's followOutput option doesn't work well with fast updates. We are trying to help it a bit. :)
  useInterval(() => {
    if (messagesBuffer.current.length === 0) {
      return;
    }

    setMessages((messages) => {
      const newMessages = messages.concat(messagesBuffer.current);
      messagesBuffer.current = [];
      return newMessages.slice(newMessages.length - displayMessagesLimit, newMessages.length);
    });

  }, sessionState === 'running' ? 32 : false)

  const applyConfig = async () => {
    if (config.startFrom.type === 'date' && config.startFrom.date !== undefined) {
      const seekReq = new SeekRequest();
      const timestamp = Timestamp.fromDate(config.startFrom.date);
      seekReq.setConsumerName(consumerName);
      seekReq.setTimestamp(timestamp);
      await consumerServiceClient.seek(seekReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to seek by timestamp. Consumer: ${consumerName}. ${err}`));
    }
  }

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList().map(m => ({ message: m, key: nanoid() }));
    setMessagesLoaded(messagesCount => messagesCount + newMessages.length);
    messagesBuffer.current.push(...newMessages);
  }, []);

  useEffect(() => {
    streamRef.current = stream;

    if (stream === undefined) {
      return;
    }

    (async () => {
      await applyConfig();
      stream.removeListener('data', streamDataHandler);
      stream.on('data', streamDataHandler);
    })()

  }, [stream]);

  const cleanup = useCallback(async () => {
    if (prevSessionState !== 'running' && prevSessionState !== 'paused') {
      return;
    }

    streamRef.current?.cancel();
    streamRef.current?.removeListener('data', streamDataHandler);
    setMessages([]);

    async function deleteConsumer() {
      const deleteConsumerReq = new DeleteConsumerRequest();
      deleteConsumerReq.setConsumerName(consumerName);
      await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to delete consumer ${consumerName}. ${err}`));
    }

    async function deleteSubscription() {
      const deleteSubscriptionReq = new DeleteSubscriptionRequest();
      deleteSubscriptionReq.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      deleteSubscriptionReq.setSubscriptionName(subscriptionName);
      deleteSubscriptionReq.setForce(true);
      await consumerServiceClient.deleteSubscription(deleteSubscriptionReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to delete subscription ${subscriptionName}. ${err}`));
    }

    deleteConsumer(); // Don't await this
    deleteSubscription(); // Don't await this
  }, [consumerName, consumerServiceClient, props.namespace, props.tenant, props.topic, props.topicType, streamDataHandler, subscriptionName]);

  const initializeSession = useCallback(() => {
    async function createConsumer() {
      const req = new CreateConsumerRequest();
      const topicSelector = new TopicSelector();
      topicSelector.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setTopicSelector(topicSelector)
      req.setConsumerName(consumerName);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED);
      req.setSubscriptionInitialPosition(config.startFrom.type === 'earliest' ? SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST : SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName}. ${err}`));

      if (res === undefined) {
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code === Code.OK) {
        setSessionState('running');
      }

      if (code !== Code.OK) {
        const errorMessage = status?.getMessage();
        notifyError(`Unable to create consumer. ${errorMessage}`);
        return;
      }
    }

    createConsumer();

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [cleanup, config, consumerServiceClient, props.namespace, props.tenant, props.topic, props.topicType, subscriptionName]);

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setSessionStateBeforeWindowBlur(sessionState);
      setSessionState('paused');
      return;
    }

    if (document.visibilityState === 'visible') {
      setSessionState(sessionStateBeforeWindowBlur);
      return;
    }
  }, [sessionState, sessionStateBeforeWindowBlur]);

  useEffect(() => {
    if (window === undefined) return;
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    appContext.setPerformanceOptimizations({ ...appContext.performanceOptimizations, pulsarConsumerState: sessionState === 'running' ? 'active' : 'inactive' });

    if (sessionState === 'initializing') {
      initializeSession();
    }

    if (sessionState === 'paused') {
      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName}. ${err}`));
      return;
    }

    if (sessionState === 'running') {
      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler)
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
      return;
    }

    if (sessionState === 'new' && prevSessionState !== 'new') {
      cleanup();
      return;
    }
  }, [sessionState]);

  const itemContent = useCallback<ItemContent<KeyedMessage, undefined>>((_, { key, message }) => <MessageComponent key={key} message={message} isShowTooltips={sessionState !== 'running'} />, [sessionState]);
  const overscan = useMemo(() => ({ main: window.innerHeight, reverse: window.innerHeight }), []);
  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0) {
      setSessionState('paused');
    }
  }, []);

  const content: Content = sessionState === 'new' ? 'configuration' : 'messages';

  return (
    <div className={s.Messages}>
      <Toolbar
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        messagesLoaded={messagesLoaded}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
      />

      {content === 'messages' && (
        <div
          className={s.List}
          ref={listRef}
          onWheel={onWheel}
        >
          <Virtuoso
            className={s.Virtuoso}
            ref={virtuosoRef}
            data={messages}
            totalCount={messages.length}
            itemContent={itemContent}
            overscan={overscan}
            followOutput={true}
          />

        </div>
      )}
      {content === 'configuration' && (
        <SessionConfiguration
          config={config}
          onConfigChange={setConfig}
        />
      )}
    </div>
  );
}

export default Messages;
