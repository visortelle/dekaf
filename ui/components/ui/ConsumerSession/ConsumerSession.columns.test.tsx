/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The message table's draggable column order, driven through its real headers. The message table
 * owns its own drag handlers rather than using the shared Table, so the gesture has to be pinned
 * here as well - what the DOM asks for is half of what a drop means.
 *
 * The header only exists once the session is running and holding messages, so the session is
 * started for real against a stubbed transport, exactly as the lifecycle suite does.
 */
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));

// No gRPC endpoint in jsdom, and the generated clients would try to reach one on import.
const mockClients = { current: undefined as unknown };
jest.mock('../../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current,
}));

// The message table virtualizes rows and measures its viewport; jsdom lays nothing out, so its
// header is rendered into a plain table here (the pattern TopicPositions.test.tsx uses). Only the
// header: these tests are about the columns, and the row cells are pinned elsewhere.
jest.mock('react-virtuoso', () => {
  const ReactRuntime = require('react');
  return {
    TableVirtuoso: ReactRuntime.forwardRef((props: any, _ref: unknown) =>
      ReactRuntime.createElement(
        'table',
        null,
        ReactRuntime.createElement('thead', null, props.fixedHeaderContent())
      )),
  };
});

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ConsumerSession from './ConsumerSession';
import { getDefaultManagedItem } from '../LibraryBrowser/default-library-items';
import { localStorageKeys } from '../../local-storage-keys';
import { messageThMeta } from './message-columns';
import { Status } from '../../../grpc-web/google/rpc/status_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb';
import {
  CreateConsumerResponse,
  DeleteConsumerResponse,
  Message,
  PauseResponse,
  ResumeResponse,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';

const topicContext = {
  pulsarResource: {
    type: 'topic' as const,
    tenant: 'public',
    namespace: 'default',
    topicPersistency: 'persistent' as const,
    topic: 'a-topic',
  },
};

const status = (code: number) => new Status().setCode(code).setMessage('');

/** The `on`/`removeListener`/`cancel` surface of a grpc-web ClientReadableStream, plus an emitter. */
const fakeResumeStream = () => {
  const listeners: Record<string, ((v: unknown) => void)[]> = {};
  return {
    on(event: string, cb: (v: unknown) => void) {
      (listeners[event] = listeners[event] || []).push(cb);
      return this;
    },
    removeListener(event: string, cb: (v: unknown) => void) {
      listeners[event] = (listeners[event] || []).filter((it) => it !== cb);
      return this;
    },
    cancel() {},
    emit(event: string, v?: unknown) {
      (listeners[event] || []).slice().forEach((cb) => cb(v));
    },
  };
};

/** Renders the session, plays it, and delivers one message so the message table is on screen. */
const renderRunningSession = async () => {
  const stream = fakeResumeStream();
  const okStatus = { getStatus: () => ({ getCode: () => Code.OK, getMessage: () => '' }) };
  mockClients.current = {
    consumerServiceClient: {
      createConsumer: () => Promise.resolve(new CreateConsumerResponse().setStatus(status(Code.OK))),
      resume: () => stream,
      pause: () => Promise.resolve(new PauseResponse().setStatus(status(Code.OK))),
      deleteConsumer: () => Promise.resolve(new DeleteConsumerResponse()),
      resolveTopicSelector: () => Promise.reject(new Error('not used by these tests')),
    },
    // The Tools panel's Produce tab creates a producer as soon as the session renders.
    producerServiceClient: {
      createProducer: () => Promise.resolve(okStatus),
      deleteProducer: () => Promise.resolve(okStatus),
      send: () => Promise.resolve(okStatus),
    },
    libraryServiceClient: {
      listLibraryItems: () => Promise.reject(new Error('no library in these tests')),
      getLibraryItem: () => Promise.reject(new Error('no library in these tests')),
    },
  };

  const config = { type: 'value' as const, val: getDefaultManagedItem('consumer-session-config', topicContext) };
  await act(async () => {
    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
        <ConsumerSession initialConfig={config as never} libraryContext={topicContext} />
      </SWRConfig>
    );
  });

  await act(async () => {
    fireEvent.click(screen.getByTestId('cs-play'));
  });

  const message = new Message();
  message.setValue(new StringValue().setValue('m-1'));
  message.setNumMessageProcessed(1);
  message.setNumMessageSent(1);
  await act(async () => {
    stream.emit('data', new ResumeResponse().setStatus(status(Code.OK)).setMessagesList([message]));
  });

  // The buffered message reaches the table on the flush ticker, not on arrival.
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
};

// A column's test id is not always its key (`sessionTargetIndex` renders as `cs-th-target`), and
// the persisted order is written in KEYS - so the rendered header is read back through the same
// map, and both assertions below talk about the same thing.
const keyByTestId = new Map(Object.entries(messageThMeta).map(([key, meta]) => [meta.testId, key]));
const testIdByKey = new Map(Object.entries(messageThMeta).map(([key, meta]) => [key, meta.testId]));

/** The reorderable columns in the order the header actually renders them. */
const headerOrder = () =>
  Array.from(document.querySelectorAll('th[data-testid^="cs-th-"]'))
    .map((el) => keyByTestId.get(el.getAttribute('data-testid')!)!)
    // The sticky pair is pinned in front and is not reorderable. ('index' joined the meta record
    // when it became resizable on 2026-08-11, so it now needs excluding by name too.)
    .filter((key) => key !== undefined && key !== 'publishTime' && key !== 'index');

const th = (columnKey: string) => screen.getByTestId(testIdByKey.get(columnKey)!);

/** One native drag gesture: pick a header up, hover another, drop it there. */
const dragOnto = (dragged: string, target: string) => {
  const dataTransfer = { setData: jest.fn(), getData: () => dragged, dropEffect: '', effectAllowed: '' };
  fireEvent.dragStart(th(dragged), { dataTransfer });
  fireEvent.dragOver(th(target), { dataTransfer });
  fireEvent.drop(th(target), { dataTransfer });
  fireEvent.dragEnd(th(dragged), { dataTransfer });
};

describe('dragging a message-table column header', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The flush scrolls the table to the bottom; jsdom has no scrollTo on elements.
    (Element.prototype as { scrollTo?: () => void }).scrollTo = () => undefined;
    window.localStorage.clear();
    // The Tools panel opens by default; nothing here needs it on screen.
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsOpen, 'false');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    window.localStorage.clear();
  });

  it('can move a column to the LAST position', async () => {
    await renderRunningSession();
    const before = headerOrder();
    expect(before[0]).toBe('key');
    const last = before[before.length - 1];

    // The last position is the one no drop could reach: every drop inserted BEFORE the header it
    // landed on, so the trailing slot needed a header to its right, and there is none.
    dragOnto('key', last);

    const expected = [...before.slice(1), 'key'];
    expect(headerOrder()).toEqual(expected);
    // ...and the order on screen is the order that survives a reload.
    expect(JSON.parse(window.localStorage.getItem('table:consumer-session-messages:column-order')!))
      .toEqual(expected);
  });

  it('can move a column to the FIRST position', async () => {
    await renderRunningSession();
    const before = headerOrder();
    const last = before[before.length - 1];

    dragOnto(last, 'key');

    expect(headerOrder()).toEqual([last, ...before.slice(0, before.length - 1)]);
  });
});
