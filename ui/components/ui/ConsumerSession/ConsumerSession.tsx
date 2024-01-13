import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './ConsumerSession.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import {
  Message,
  CreateConsumerRequest,
  ResumeRequest,
  ResumeResponse,
  DeleteConsumerRequest,
  PauseRequest,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { ItemContent, TableVirtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../proto-utils/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar';
import { SessionState, MessageDescriptor, ConsumerSessionConfig } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import Console from './Console/Console';
import { consumerSessionConfigToPb, messageDescriptorFromPb } from './conversions/conversions';
import { Sort, sortMessages } from './sort';
import { remToPx } from '../rem-to-px';
import { help } from './Message/fields';
import { ManagedConsumerSessionConfigValOrRef } from '../LibraryBrowser/model/user-managed-items';
import { consumerSessionConfigFromValOrRef } from '../LibraryBrowser/model/resolved-items-conversions';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import { getColoring } from './coloring';
import { getValueProjectionThs } from './value-projections/value-projections-utils';
import { Th } from './Th';
import { ProductCode } from '../../app/licensing/ProductCode';

const consoleCss = "color: #276ff4; font-weight: var(--font-weight-bold);" as const;
const productPlanMessagesLimit = 50 as const;

export type SessionProps = {
  sessionKey: number;
  configValOrRef: ManagedConsumerSessionConfigValOrRef;
  onConfigValOrRefChange: (config: ManagedConsumerSessionConfigValOrRef) => void;
  onStopSession: () => void;
  isShowConsole: boolean;
  onSetIsShowConsole: (v: boolean) => void;
  libraryContext: LibraryContext;
};

type View = 'messages' | 'configuration';
type MessagesPerSecond = { prev: number, now: number };

const displayMessagesRealTimeLimit = 250; // too many items leads to table blinking.

const Session: React.FC<SessionProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient } = GrpcClient.useContext();
  const [sessionState, setSessionState] = useState<SessionState>('new');
  const [sessionStateBeforeWindowBlur, setSessionStateBeforeWindowBlur] = useState<SessionState>(sessionState);
  const prevSessionState = usePrevious(sessionState);
  const consumerName = useRef<string>('__dekaf_' + nanoid());
  const subscriptionName = useRef<string>('__dekaf_' + nanoid());
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
  const [isProductPlanLimitReached, setIsProductPlanLimitReached] = useState<boolean>(false);

  const currentTopic = useMemo(() => props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined, [props.libraryContext]);
  const currentTopicFqn: string | undefined = useMemo(() => currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`, [currentTopic]);

  const config = useMemo<ConsumerSessionConfig | undefined>(() => {
    try {
      return consumerSessionConfigFromValOrRef(props.configValOrRef, currentTopicFqn);
    } catch (err) {
      console.warn(err);
      return undefined;
    }
  }, [props.configValOrRef]);

  const scrollToBottom = () => {
    const scrollParent = tableRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight, behavior: 'auto' });
  }

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prev: messagesLoaded, now: messagesLoaded - messagesLoadedPerSecond.prev }));
    setMessagesProcessedPerSecond(() => ({ prev: messagesProcessed.current, now: messagesProcessed.current - messagesProcessedPerSecond.prev }));
  }, 1000);

  useInterval(() => {
    scrollToBottom();
  }, sessionState === 'running' ? 200 : false);

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
  }, messagesLoadedPerSecond.now > 0 ? 250 : false);

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
    // PRODUCT PLAN LIMITATION START
    if (appContext.config.productCode === ProductCode.DekafDesktopFree || appContext.config.productCode === ProductCode.DekafFree) {
      if (messagesLoaded > productPlanMessagesLimit) {
        setSessionState('pausing');
        setIsProductPlanLimitReached(true);
      }
    }
    // PRODUCT PLAN LIMITATION END
  }, [messagesLoaded]);

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

  const initializeSession = () => {
    async function createConsumer() {
      if (config === undefined) {
        return;
      }

      const req = new CreateConsumerRequest();

      req.setConsumerName(consumerName.current);
      const consumerSessionConfigPb = consumerSessionConfigToPb(config);
      req.setConsumerSessionConfig(consumerSessionConfigPb);

      const res = await consumerServiceClient.createConsumer(req, {}).catch(err => notifyError(`Unable to create consumer ${consumerName.current}. ${err}`));
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
    };
  };

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      setSessionStateBeforeWindowBlur(sessionState);
      setSessionState('pausing');
      return;
    }

    if (document.visibilityState === 'visible') {
      setSessionState(sessionStateBeforeWindowBlur);
      return;
    }
  };

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
      console.info('%cSession config: %o', consoleCss, props.configValOrRef);
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

  const valueProjectionThs = useMemo(() => {
    return config ? getValueProjectionThs({
      sessionConfig: config,
      sort,
      setSort
    }) : [];
  }, [config, sort, setSort]);
  console.log('sw', sort);

  const itemContent = useCallback<ItemContent<MessageDescriptor, undefined>>((i, message) => {
    if (config === undefined) {
      return;
    }

    const coloring = getColoring(config, message);

    return (
      <MessageComponent
        key={i}
        message={message}
        sessionConfig={config}
        isShowTooltips={isShowTooltips}
        coloring={coloring}
        valueProjectionThs={valueProjectionThs}
      />
    );
  }, [sessionState, config]);

  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0 && sessionState === 'running') {
      setSessionState('pausing');
    }
  }, [sessionState]);

  const currentView: View = sessionState === 'new' ? 'configuration' : 'messages';
  const sortedMessages = useMemo(() => {
    const msgs = sessionState === 'running' ? messages.slice(messages.length - displayMessagesRealTimeLimit) : messages;
    return sortMessages(msgs, sort);
  }, [messages, sort, sessionState]);

  return (
    <div className={s.ConsumerSession}>
      <Toolbar
        config={config}
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
        isProductPlanLimitReached={isProductPlanLimitReached}
      />

      {currentView === 'messages' && messages.length === 0 && (
        <div className={s.NoDataToShow}>
          {sessionState === 'initializing' && 'Initializing session.'}
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
                <Th
                  key="index"
                  title="#"
                  sort={sort}
                  setSort={setSort}
                  sortKey="index"
                  style={{ position: 'sticky', left: 0, zIndex: 10 }}
                  help={(
                    <>
                      <p>
                        When consuming from multiple topics or a single partitioned topic, the order of messages cannot be assured.
                      </p>
                      <p>
                        The order of numbers in in this column represents the order in which messages were received by the consumer.
                      </p>
                    </>
                  )}
                />
                <Th
                  key="publishTime"
                  title="Publish time"
                  sort={sort}
                  setSort={setSort}
                  sortKey="publishTime"
                  style={{ position: 'sticky', left: remToPx(60), zIndex: 10 }}
                  help={help.publishTime}
                />
                <Th
                  key="key"
                  title="Key"
                  sort={sort}
                  setSort={setSort}
                  sortKey="key"
                  help={help.key}
                />

                {valueProjectionThs.map(vp => vp.th)}

                <Th
                  key="value"
                  title="Value"
                  sort={sort}
                  setSort={setSort}
                  sortKey="value"
                  help={help.value}
                />
                <Th
                  key="target"
                  title="Target"
                  sort={sort}
                  setSort={setSort}
                  sortKey="sessionTargetIndex"
                  help={help.sessionTargetIndex}
                />
                <Th
                  key="topic"
                  title="Topic"
                  sort={sort}
                  setSort={setSort}
                  sortKey="topic"
                  help={help.topic}
                />
                <Th
                  key="producer"
                  title="Producer"
                  sort={sort}
                  setSort={setSort}
                  sortKey="producerName"
                  help={help.producerName}
                />
                <Th
                  key="schemaVersion"
                  title="Schema version"
                  sort={sort}
                  setSort={setSort}
                  sortKey="schemaVersion"
                  help={help.schemaVersion}
                />
                <Th
                  key="size"
                  title="Size"
                  sort={sort}
                  setSort={setSort}
                  sortKey="size"
                  help={help.size}
                />
                <Th
                  key="properties"
                  title="Properties"
                  sort={sort}
                  setSort={setSort}
                  sortKey="properties"
                  help={help.propertiesMap}
                />
                <Th
                  key="eventTime"
                  title="Event time"
                  sort={sort}
                  setSort={setSort}
                  sortKey="eventTime"
                  help={help.eventTime}
                />
                <Th
                  key="brokerPublishTime"
                  title="Broker pub. time"
                  sort={sort}
                  setSort={setSort}
                  sortKey="brokerPublishTime"
                  help={help.brokerPublishTime}
                />
                <Th
                  key="messageId"
                  title="Message Id"
                  sort={sort}
                  setSort={setSort}
                  help={help.messageId}
                />
                <Th
                  key="sequenceId"
                  title="Sequence Id"
                  sort={sort}
                  setSort={setSort}
                  sortKey="sequenceId"
                  help={help.sequenceId}
                />
                <Th
                  key="orderingKey"
                  title="Ordering key"
                  sort={sort}
                  setSort={setSort}
                  help={help.orderingKey}
                />
                <Th
                  key="redeliveryCount"
                  title="Redelivery count"
                  sort={sort}
                  setSort={setSort}
                  sortKey="redeliveryCount"
                  help={help.redeliveryCount}
                />
                <Th
                  key="sessionContextState"
                  title="Session Context State"
                  sort={sort}
                  setSort={setSort}
                  sortKey="sessionContextStateJson"
                  help={help.sessionContextStateJson}
                />
              </tr>
            )}
          />
        </div>
      )}

      {currentView === 'configuration' && (
        <div className={s.SessionConfiguration}>
          <SessionConfiguration
            value={props.configValOrRef}
            onChange={props.onConfigValOrRefChange}
            libraryContext={props.libraryContext}
          />
        </div>
      )}

      <Console
        isShow={props.isShowConsole}
        onClose={() => props.onSetIsShowConsole(false)}
        sessionKey={props.sessionKey}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        sessionConfig={config}
        sessionSubscriptionName={subscriptionName.current}
        messages={messages}
        consumerName={consumerName.current}
        currentTopic={currentTopicFqn}
      />
    </div>
  );
}

type ConsumerSessionProps = {
  initialConfig: ManagedConsumerSessionConfigValOrRef;
  libraryContext: LibraryContext;
};
const ConsumerSession: React.FC<ConsumerSessionProps> = (props) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [config, setConfig] = useState<ManagedConsumerSessionConfigValOrRef>(props.initialConfig);
  const [isShowConsole, setIsShowConsole] = useState<boolean>(false);

  return (
    <Session
      key={sessionKey}
      sessionKey={sessionKey}
      isShowConsole={isShowConsole}
      onSetIsShowConsole={() => setIsShowConsole(!isShowConsole)}
      {...props}
      onStopSession={() => setSessionKey(n => n + 1)}
      configValOrRef={config}
      onConfigValOrRefChange={setConfig}
      libraryContext={props.libraryContext}
    />
  );
}

export default ConsumerSession;
