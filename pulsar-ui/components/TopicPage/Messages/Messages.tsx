import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, CreateConsumerRequest, ResumeRequest, ResumeResponse, SubscriptionType, TopicSelector, DeleteConsumerRequest, PauseRequest, SubscriptionInitialPosition, DeleteSubscriptionRequest, SeekRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import Toolbar, { Filter } from './Toolbar';

export type MessagesProps = {
  tenant: string,
  namespace: string,
  topicType: 'persistent' | 'non-persistent',
  topic: string,
  messages: KeyedMessage[],
  onMessagesChange: (messages: KeyedMessage[]) => void,
  filter: Filter,
  onFilterChange: (filter: Filter) => void,
  sessionKey: number,
};

type KeyedMessage = {
  message: Message,
  key: string
}

const displayMessagesLimit = 10000;

const Messages: React.FC<MessagesProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const listRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [isPaused, setIsPaused] = useState(true);
  const [isPausedBeforeWindowBlur, setIsPausedBeforeWindowBlur] = useState(isPaused);
  const consumerName = useRef('__xray_' + nanoid());
  const subscriptionName = useRef('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();
  const streamRef = useRef<ClientReadableStream<ResumeResponse>>();
  const [messagesLoaded, setMessagesLoaded] = useState(0);
  const [latestFilterKey, setLatestFilterKey] = useState(-1);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<{ prevMessagesLoaded: number, messagesLoadedPerSecond: number }>({ prevMessagesLoaded: 0, messagesLoadedPerSecond: 0 });
  const messagesBuffer = useRef<KeyedMessage[]>([]);

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prevMessagesLoaded: messagesLoaded, messagesLoadedPerSecond: isPaused ? 0 : messagesLoaded - messagesLoadedPerSecond.prevMessagesLoaded }));
  }, isPaused ? false : 1000);
  useInterval(() => {
    if (messagesBuffer.current.length === 0) {
      return;
    }

    let messagesToSet = props.messages.concat(messagesBuffer.current);
    messagesToSet = messagesToSet.slice(messagesToSet.length - displayMessagesLimit, messagesToSet.length);
    props.onMessagesChange(messagesToSet);

    messagesBuffer.current = [];
  }, isPaused ? false : 32)

  const applyFilter = async () => {
    setLatestFilterKey(props.sessionKey);

    if (props.filter.startFrom.type === 'date') {
      const seekReq = new SeekRequest();
      const timestamp = new Timestamp();
      timestamp.setSeconds(props.filter.startFrom.date.getTime() / 1000);
      timestamp.setNanos(props.filter.startFrom.date.getMilliseconds() * 1000);
      seekReq.setConsumerName(consumerName.current);
      seekReq.setTimestamp(timestamp);
      await consumerServiceClient.seek(seekReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to seek by timestamp. Consumer: ${consumerName.current}. ${err}`));
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

    stream.removeListener('data', streamDataHandler)
    stream.on('data', streamDataHandler);
  }, [stream]);

  useEffect(() => {
    async function createConsumer() {
      const req = new CreateConsumerRequest();
      const topicSelector = new TopicSelector();
      topicSelector.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setTopicSelector(topicSelector)
      req.setConsumerName(consumerName.current);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName.current);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED);
      req.setSubscriptionInitialPosition(SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName.current}. ${err}`));
      await applyFilter();

      if (res === undefined) {
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code !== Code.OK) {
        const errorMessage = status?.getMessage();
        notifyError(`Unable to create consumer. ${errorMessage}`);
        return;
      }
    }

    createConsumer();

    const cleanup = async () => {
      streamRef.current?.cancel();
      streamRef.current?.removeListener('data', streamDataHandler);

      async function deleteConsumer() {
        const deleteConsumerReq = new DeleteConsumerRequest();
        deleteConsumerReq.setConsumerName(consumerName.current);
        await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete consumer ${consumerName.current}. ${err}`));
      }

      async function deleteSubscription() {
        const deleteSubscriptionReq = new DeleteSubscriptionRequest();
        deleteSubscriptionReq.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
        deleteSubscriptionReq.setSubscriptionName(subscriptionName.current);
        deleteSubscriptionReq.setForce(true);
        await consumerServiceClient.deleteSubscription(deleteSubscriptionReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete subscription ${subscriptionName.current}. ${err}`));
      }

      deleteConsumer(); // Don't await this
      deleteSubscription(); // Don't await this
    };

    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setIsPausedBeforeWindowBlur(isPaused);
      setIsPaused(true);
      return;
    }

    if (document.visibilityState === 'visible') {
      setIsPaused(isPausedBeforeWindowBlur);
      return;
    }
  }, [isPaused, isPausedBeforeWindowBlur]);

  useEffect(() => {
    if (window === undefined) return;
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    if (isPaused) {
      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName.current);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName.current}. ${err}`));
    } else {
      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName.current);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler)
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
    }

    // New session has been initiated.
    if (!isPaused && props.sessionKey !== latestFilterKey) {
      props.onMessagesChange([]);
    }

    appContext.setPerformanceOptimizations({ ...appContext.performanceOptimizations, pulsarConsumerState: isPaused ? 'inactive' : 'active' });
  }, [isPaused]);

  return (
    <div className={s.Messages}>
      <Toolbar
        isPaused={isPaused}
        onSetIsPaused={setIsPaused}
        filter={props.filter}
        onFilterChange={props.onFilterChange}
        messagesLoaded={messagesLoaded}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
      />
      <div
        className={s.List}
        ref={listRef}
        onWheel={(e) => {
          if (e.deltaY < 0) {
            setIsPaused(() => true);
            return;
          }
        }}
      >
        <Virtuoso<KeyedMessage>
          className={s.Virtuoso}
          ref={virtuosoRef}
          data={props.messages}
          totalCount={props.messages.length}
          customScrollParent={listRef.current || undefined}
          itemContent={(_, { key, message }) => <MessageComponent key={key} message={message} isShowTooltips={isPaused} />}
          overscan={{ main: window.innerHeight, reverse: window.innerHeight }}
          followOutput={'auto'}
        />
      </div>
    </div>
  );
}

const _Messages: React.FC<Omit<MessagesProps, 'sessionKey' | 'messages' | 'onMessagesChange' | 'filter' | 'onFilterChange'>> = (props) => {
  const [filter, setFilter] = useState<Filter>({ startFrom: { type: 'earliest' } });
  const [messages, setMessages] = useState<KeyedMessage[]>([]);

  const [sessionKey, setSessionKey] = useState(0);

  return (
    <Messages
      key={sessionKey}
      {...props}
      sessionKey={sessionKey}
      messages={messages}
      onMessagesChange={setMessages}
      filter={filter}
      onFilterChange={(v) => {
        setFilter(v);
        setSessionKey(v => v + 1);
      }}
    />
  );
}

export default _Messages;
