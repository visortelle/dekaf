import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import {
  Message,
  CreateConsumerRequest,
  ResumeRequest,
  ResumeResponse,
  SubscriptionType,
  TopicsSelector,
  DeleteConsumerRequest,
  PauseRequest,
  RegexSubscriptionMode,
  TopicsSelectorByNames,
  TopicsSelectorByRegex,
  SubscriptionMode,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import arrowDownIcon from '../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '../../ui/ChildrenTable/arrow-up.svg';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import { ItemContent, TableVirtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../pbUtils/pbUtils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar';
import { SessionState, ConsumerSessionConfig, MessageDescriptor } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import Console from './Console/Console';
import useSWR from 'swr';
import { GetTopicsInternalStatsRequest } from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { swrKeys } from '../../swrKeys';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import { consumerSessionConfigToPb, messageDescriptorFromPb } from './conversions';
import { SortKey, Sort, sortMessages } from './sort';
import { remToPx } from '../../ui/rem-to-px';
import { help } from './Message/fields';
import { tooltipId } from '../../ui/Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

const consoleCss = "color: #276ff4; font-weight: var(--font-weight-bold);";

export type SessionProps = {
  sessionKey: number;
  config: ConsumerSessionConfig;
  onConfigChange: (config: ConsumerSessionConfig) => void;
  onStopSession: () => void;
  isShowConsole: boolean;
  onSetIsShowConsole: (v: boolean) => void;
};

type View = 'messages' | 'configuration';
type MessagesPerSecond = { prev: number, now: number };

const displayMessagesRealTimeLimit = 250; // too many items leads to table blinking.

const Session: React.FC<SessionProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient, topicServiceClient } = GrpcClient.useContext();
  const [sessionState, setSessionState] = useState<SessionState>('new');
  const [sessionStateBeforeWindowBlur, setSessionStateBeforeWindowBlur] = useState<SessionState>(sessionState);
  const prevSessionState = usePrevious(sessionState);
  const consumerName = useRef<string>('__pulsocat_' + nanoid());
  const subscriptionName = useRef<string>('__pulsocat_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse> | undefined>(undefined);
  const streamRef = useRef<ClientReadableStream<ResumeResponse> | undefined>(undefined);
  const [displayMessagesLimit, setDisplayMessagesLimit] = useState<number>(10000);
  const [messagesLoaded, setMessagesLoaded] = useState<number>(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<MessagesPerSecond>({ prev: 0, now: 0 });
  const [messagesProcessedPerSecond, setMessagesProcessedPerSecond] = useState<MessagesPerSecond>({ prev: 0, now: 0 });
  const messagesProcessed = useRef<number>(0);
  const messagesBuffer = useRef<Message[]>([]);
  const [messages, setMessages] = useState<MessageDescriptor[]>([]);
  const [sort, setSort] = useState<Sort>({ key: 'publishTime', direction: 'asc' });
  const { topicsSelector } = props.config;

  const { data: topicsInternalStats, error: topicsInternalStatsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.topicsInternalStats._(
      props.config.topicsSelector.type === 'by-names' ? props.config.topicsSelector.topics : []
    ).concat([props.sessionKey.toString()]), // In case we cache the response, there cases where initial cursor position is from previous session.
    async () => {
      if (props.config.topicsSelector.type !== 'by-names') {
        return undefined;
      }

      const req = new GetTopicsInternalStatsRequest();
      req.setTopicsList(props.config.topicsSelector.topics);
      const res = await topicServiceClient.getTopicsInternalStats(req, {})
        .catch((err) => notifyError(`Unable to get topics internal stats. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topics internal stats. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res;
    },
    { refreshInterval: sessionState === 'awaiting-initial-cursor-positions' ? 150 : 1000 }
  );

  if (topicsInternalStatsError) {
    notifyError(`Unable to get topics internal stats. ${topicsInternalStatsError}`);
  }

  const scrollToBottom = () => {
    const scrollParent = tableRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight, behavior: 'auto' });
  }

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prev: messagesLoaded, now: messagesLoaded - messagesLoadedPerSecond.prev }));
    setMessagesProcessedPerSecond(() => ({ prev: messagesProcessed.current, now: messagesProcessed.current - messagesProcessedPerSecond.prev }));
  }, 1000);

  useInterval(() => {
    if (messagesBuffer.current.length === 0) {
      return;
    }

    setMessages((messages) => {
      const newMessages = messages
        .concat(messagesBuffer.current.map(msg => messageDescriptorFromPb(msg)))
        .slice(-displayMessagesLimit);

      newMessages.forEach((message, i) => {
        message.index = (i + 1);
      });

      messagesBuffer.current = [];
      scrollToBottom();
      return newMessages;
    });
  }, messagesLoadedPerSecond.now > 0 ? 500 : false);

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList();
    setMessagesLoaded(messagesCount => messagesCount + newMessages.length);
    for (let i = 0; i < newMessages.length; i++) {
      messagesBuffer.current.push(newMessages[i]);
    }

    messagesProcessed.current = res.getProcessedMessages();

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`${res.getStatus()?.getMessage()}`);
    }
  }, []);

  useEffect(() => {
    streamRef.current = stream;

    (async () => {
      if (stream === undefined) {
        return;
      }

      stream.removeListener('data', streamDataHandler);
      stream.on('data', streamDataHandler);
    })()

  }, [stream]);

  const cleanup = useCallback(async () => {
    console.info(`%cCleaning up session: ${props.sessionKey}`, consoleCss);

    streamRef.current?.cancel();
    streamRef.current?.removeListener('data', streamDataHandler);
    setMessages([]);

    async function deleteConsumer() {
      const deleteConsumerReq = new DeleteConsumerRequest();
      deleteConsumerReq.setConsumerName(consumerName.current);
      await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to delete consumer ${consumerName.current}. ${err}`));
    }

    deleteConsumer(); // Don't await this
  }, [prevSessionState, sessionState]);

  useEffect(() => {
    return () => {
      cleanup();
    }
  }, []);

  const initializeSession = useCallback(() => {
    async function createConsumer() {
      const req = new CreateConsumerRequest();
      const topicSelector = new TopicsSelector();

      if (topicsSelector.type === 'by-names') {
        const selector = new TopicsSelectorByNames();
        selector.setTopicsList(topicsSelector.topics);
        topicSelector.setByNames(selector);
      }

      if (topicsSelector.type === 'by-regex') {
        const selector = new TopicsSelectorByRegex();
        selector.setPattern(topicsSelector.pattern);

        let regexSubscriptionMode: RegexSubscriptionMode;
        switch (topicsSelector.regexSubscriptionMode) {
          case 'unspecified': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_UNSPECIFIED; break;
          case 'persistent-only': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY; break;
          case 'non-persistent-only': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY; break;
          case 'all-topics': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS; break;
        }

        selector.setRegexSubscriptionMode(regexSubscriptionMode);
        topicSelector.setByRegex(selector);
      }

      req.setTopicsSelector(topicSelector)
      req.setConsumerName(consumerName.current);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName.current);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE);
      req.setSubscriptionMode(SubscriptionMode.SUBSCRIPTION_MODE_NON_DURABLE);

      const consumerSessionConfigPb = consumerSessionConfigToPb(props.config);
      req.setConsumerSessionConfig(consumerSessionConfigPb);

      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, {}).catch(err => notifyError(`Unable to create consumer ${consumerName.current}. ${err}`));
      if (res === undefined) {
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code === Code.OK) {
        setSessionState('awaiting-initial-cursor-positions');
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
    };
  }, [props.config, subscriptionName.current]);

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setSessionStateBeforeWindowBlur(sessionState);
      setSessionState('pausing');
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
      console.info(`%cInitializing session: ${props.sessionKey}`, consoleCss);

      initializeSession();
    }

    if (sessionState === 'pausing') {
      console.info(`%cPausing session: ${props.sessionKey}`, consoleCss);

      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName.current);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName.current}. ${err}`));

      return;
    }

    if (sessionState === 'awaiting-initial-cursor-positions') {
      console.info(`%cAwaiting initial cursor positions for session: ${props.sessionKey}`, consoleCss);
    }

    if (sessionState === 'got-initial-cursor-positions') {
      console.info(`%cGot initial cursor positions for session: ${props.sessionKey}`, consoleCss);
      setSessionState('running');
    }

    if (sessionState === 'running') {
      console.info(`%cRunning session: ${props.sessionKey}`, consoleCss);

      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName.current);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler);
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
      return;
    }

    if (sessionState && prevSessionState === undefined) {
      console.info(`%c--------------------`, consoleCss);
      console.info(`%cStarting new consumer session: ${props.sessionKey}`, consoleCss);
      console.info('%cSession config: %o', consoleCss, props.config);
      console.info('%cConsumer name:', consoleCss, consumerName.current);
      console.info('%cSubscription name:', consoleCss, subscriptionName.current);
    }

    if (sessionState === 'new' && prevSessionState !== undefined) {
      cleanup();
    }
  }, [sessionState]);

  useEffect(() => {
    if (sessionState === 'pausing' && messagesLoadedPerSecond.now === 0) {
      setSessionState('paused');
      setTimeout(scrollToBottom, 250);
    }
  }, [sessionState, messagesLoadedPerSecond]);

  const isShowTooltips = sessionState !== 'running' && sessionState !== 'pausing';
  const itemContent = useCallback<ItemContent<MessageDescriptor, undefined>>((i, message) => <MessageComponent key={i} message={message} isShowTooltips={isShowTooltips} />, [sessionState]);
  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0 && sessionState === 'running') {
      setSessionState('pausing');
    }
  }, [sessionState]);

  const Th = useCallback((props: { title: React.ReactNode, help: React.ReactElement, sortKey?: SortKey, style?: React.CSSProperties }) => {
    const handleColumnHeaderClick = () => {
      if (props.sortKey === undefined) {
        return;
      }

      if (sort.key === props.sortKey) {
        setSort({ key: props.sortKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        setSort({ key: props.sortKey, direction: 'asc' });
      }
    }

    return (
      <th className={cts.Th} style={props.style} onClick={handleColumnHeaderClick}>
        <div
          className={props.sortKey === undefined ? '' : cts.SortableTh}
          data-tooltip-id={tooltipId}
          data-tooltip-html={renderToStaticMarkup(props.help)}
        >
          {props.title}

          {sort.key === props.sortKey && (
            <div className={cts.SortableThIcon}>
              <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
            </div>
          )}
        </div>
      </th>
    );
  }, [sort]);

  const currentView: View = sessionState === 'new' ? 'configuration' : 'messages';
  const sortedMessages = useMemo(() => {
    const msgs = sessionState === 'running' ? messages.slice(messages.length - displayMessagesRealTimeLimit) : messages;
    return sortMessages(msgs, sort);
  }, [messages, sort, sessionState]);

  return (
    <div className={s.Messages}>
      <Toolbar
        config={props.config}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        messagesLoaded={messagesLoaded}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
        messagesProcessedPerSecond={messagesProcessedPerSecond}
        messagesProcessed={messagesProcessed.current}
        onStopSession={props.onStopSession}
        onToggleConsoleClick={() => props.onSetIsShowConsole(!props.isShowConsole)}
        displayMessagesLimit={displayMessagesLimit}
        onDisplayMessagesLimitChange={setDisplayMessagesLimit}
      />

      {currentView === 'messages' && messages.length === 0 && (
        <div className={s.NoDataToShow}>
          {sessionState === 'initializing' && 'Initializing session.'}
          {sessionState === 'awaiting-initial-cursor-positions' && 'Awaiting for initial cursor positions.'}
          {sessionState === 'running' && 'Awaiting for new messages...'}
          {sessionState === 'paused' && 'No messages where loaded.'}
        </div>
      )}
      {currentView === 'messages' && messages.length > 0 && (
        <div
          className={cts.Table}
          style={{ position: 'relative' }}
          ref={tableRef}
          onWheel={onWheel}
        >
          {sessionState === 'pausing' && (
            <div className={s.TableSpinner}>
              <div className={s.TableSpinnerContent}>Pausing session...</div>
            </div>
          )}
          <TableVirtuoso
            className={s.Virtuoso}
            ref={virtuosoRef}
            data={sortedMessages}
            totalCount={sortedMessages.length}
            itemContent={itemContent}
            followOutput={sessionState === 'running'}
            fixedHeaderContent={() => (
              <tr>
                <Th title="#" sortKey="index" style={{ position: 'sticky', left: 0, zIndex: 10 }} help={<>Message index in this view.</>} />
                <Th title="Publish time" sortKey="publishTime" style={{ position: 'sticky', left: remToPx(60), zIndex: 10 }} help={help.publishTime} />
                <Th title="" style={{ position: 'sticky', left: remToPx(285), zIndex: 10 }} help={<></>} />
                <Th title="Key" sortKey="key" help={help.key} />
                <Th title="Value" sortKey="value" help={help.value} />
                <Th title="Topic" sortKey="topic" help={help.topic} />
                <Th title="Producer" sortKey="producerName" help={help.producerName} />
                <Th title="Schema version" sortKey="schemaVersion" help={help.schemaVersion} />
                <Th title="Size" sortKey="size" help={help.size} />
                <Th title="Properties" sortKey="properties" help={help.propertiesMap} />
                <Th title="Event time" sortKey="eventTime" help={help.eventTime} />
                <Th title="Broker pub. time" sortKey="brokerPublishTime" help={help.brokerPublishTime} />
                <Th title="Message Id" help={help.messageId} />
                <Th title="Sequence Id" sortKey="sequenceId" help={help.sequenceId} />
                <Th title="Ordering key" help={help.orderingKey} />
                <Th title="Redelivery count" sortKey="redeliveryCount" help={help.redeliveryCount} />
                <Th title="Accumulator" sortKey="accumulator" help={help.accumulator} />
              </tr>
            )}
          />
        </div>
      )}

      {currentView === 'configuration' && (
        <div className={s.SessionConfiguration}>
          <SessionConfiguration
            config={props.config}
            onConfigChange={props.onConfigChange}
            topicsInternalStats={topicsInternalStats}
          />
        </div>
      )}

      <Console
        isShow={props.isShowConsole}
        onClose={() => props.onSetIsShowConsole(false)}
        sessionKey={props.sessionKey}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        sessionConfig={props.config}
        sessionSubscriptionName={subscriptionName.current}
        topicsInternalStats={topicsInternalStats}
        messages={messages}
        consumerName={consumerName.current}
      />
    </div>
  );
}

type SessionControllerProps = {
  config: ConsumerSessionConfig;
};
const SessionController: React.FC<SessionControllerProps> = (props) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [config, setConfig] = useState<ConsumerSessionConfig>(props.config);
  const [isShowConsole, setIsShowConsole] = useState<boolean>(false);

  return (
    <Session
      key={sessionKey}
      sessionKey={sessionKey}
      isShowConsole={isShowConsole}
      onSetIsShowConsole={() => setIsShowConsole(!isShowConsole)}
      {...props}
      onStopSession={() => setSessionKey(n => n + 1)}
      config={config}
      onConfigChange={(v) => setConfig(v)}
    />
  );
}

export default SessionController;
