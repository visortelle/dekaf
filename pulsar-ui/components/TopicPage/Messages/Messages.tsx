import React, { Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, CreateConsumerRequest, ResumeRequest, ResumeResponse, SubscriptionType, TopicSelector, DeleteConsumerRequest, PauseRequest, SubscriptionInitialPosition, DeleteSubscriptionRequest, SeekRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
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
import Toolbar, { Filter } from './Toolbar';
import { isEqual } from 'lodash';

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
  onSessionKeyChange: (sessionKey: number) => void,
};

type KeyedMessage = {
  message: Message,
  key: string
}

const displayMessagesLimit = 10000;

const Messages: React.FC<MessagesProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [isPaused, setIsPaused] = useState(true);
  const [isPausedBeforeWindowBlur, setIsPausedBeforeWindowBlur] = useState(isPaused);
  const [consumerName, setConsumerName] = useState('__xray_' + nanoid());
  const [subscriptionName, setSubscriptionName] = useState('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();
  const streamRef = useRef<ClientReadableStream<ResumeResponse>>();
  const [messagesLoaded, setMessagesLoaded] = useState(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<{ prevMessagesLoaded: number, messagesLoadedPerSecond: number }>({ prevMessagesLoaded: 0, messagesLoadedPerSecond: 0 });
  const messagesBuffer = useRef<KeyedMessage[]>([]);
  const prevFilter = usePrevious(props.filter);

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

  useEffect(() => {
    if (prevFilter !== undefined && !isEqual(prevFilter, props.filter)) {
      // Start new session.
      props.onSessionKeyChange(props.sessionKey + 1);
    }

  }, [props.filter]);

  const applyFilter = async () => {
    if (props.filter.startFrom.type === 'date' && props.filter.startFrom.date !== undefined) {
      const seekReq = new SeekRequest();
      const timestamp = new Timestamp();
      timestamp.setSeconds(props.filter.startFrom.date.getTime() / 1000);
      timestamp.setNanos(props.filter.startFrom.date.getMilliseconds() * 1000);
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

    stream.removeListener('data', streamDataHandler)
    stream.on('data', streamDataHandler);
  }, [stream]);

  useEffect(() => {
    async function createConsumer() {
      const req = new CreateConsumerRequest();
      const topicSelector = new TopicSelector();
      topicSelector.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setTopicSelector(topicSelector)
      req.setConsumerName(consumerName);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED);
      req.setSubscriptionInitialPosition(props.filter.startFrom.type === 'earliest' ? SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST : SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName}. ${err}`));

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

    async function initNewSession() {
      await createConsumer();
      await applyFilter();
    }

    initNewSession();

    const cleanup = async () => {
      streamRef.current?.cancel();
      streamRef.current?.removeListener('data', streamDataHandler);

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
      pauseReq.setConsumerName(consumerName);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName}. ${err}`));
    } else {
      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler)
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
    }

    appContext.setPerformanceOptimizations({ ...appContext.performanceOptimizations, pulsarConsumerState: isPaused ? 'inactive' : 'active' });
  }, [isPaused]);

  const itemContent = useCallback<ItemContent<KeyedMessage, undefined>>((_, { key, message }) => <MessageComponent key={key} message={message} isShowTooltips={isPaused} />, [isPaused]);
  const overscan = useMemo(() => ({ main: window.innerHeight, reverse: window.innerHeight }), []);
  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0) {
      setIsPaused(() => true);
    }
  }, []);

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
        onWheel={onWheel}
      >
        <Virtuoso
          className={s.Virtuoso}
          ref={virtuosoRef}
          data={props.messages}
          totalCount={props.messages.length}
          itemContent={itemContent}
          overscan={overscan}
          followOutput={true}
        />
      </div>
    </div>
  );
}

type _MessagesProps = {
  tenant: string,
  namespace: string,
  topicType: 'persistent' | 'non-persistent',
  topic: string,
}
const _Messages: React.FC<_MessagesProps> = (props) => {
  const [filter, setFilter] = useState<Filter>({ startFrom: { type: 'latest' } });
  const [messages, setMessages] = useState<KeyedMessage[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const prevSessionKey = usePrevious(sessionKey);

  useEffect(() => {
    if (prevSessionKey !== undefined && prevSessionKey !== sessionKey) {
      setMessages([]);
    }
  }, [sessionKey]);

  return (
    <Messages
      key={sessionKey}
      tenant={props.tenant}
      namespace={props.namespace}
      topic={props.topic}
      topicType={props.topicType}
      messages={messages}
      onMessagesChange={setMessages}
      filter={filter}
      onFilterChange={setFilter}
      sessionKey={sessionKey}
      onSessionKeyChange={setSessionKey}
    />
  );
}

export default _Messages;
