/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The start-position degradation banner's RENDER BOUND.
 *
 * The banner is sticky and disclosed on purpose - a start cut that could not be resolved against
 * every topic really is degraded, and the session must keep saying so. What must NOT scale with the
 * degradation is the DOM: a topic selector admits up to 2,000 streams, and the banner used to build
 * one `<li>` per abandoned stream, so the worst-case session grew a ~2,000-node subtree at exactly
 * the moment it was already under stress.
 *
 * So the bound is asserted at the wide end, where the difference is real, and the same tests pin
 * that nothing was hidden by it: the count is still stated, the full list is one click away, and
 * the copy affordance yields every name.
 *
 * The banner only exists once the session left `new`, so the session is started for real against a
 * stubbed transport and the degradation arrives the way the server sends it - on a resume frame's
 * `consumer_stats` - exactly as the lifecycle and columns suites drive it.
 *
 * Note: with a jest.mock() in the file, esbuild-jest runs babel's hoisting pass over untyped JS, so
 * imported bindings must not appear in type annotations here (inference only).
 */
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));

// No gRPC endpoint in jsdom, and the generated clients would try to reach one on import.
const mockClients = { current: undefined as unknown };
jest.mock('../../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current,
}));

import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ConsumerSession from './ConsumerSession';
import { getDefaultManagedItem } from '../LibraryBrowser/default-library-items';
import { localStorageKeys } from '../../local-storage-keys';
import { Status } from '../../../grpc-web/google/rpc/status_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import {
  ConsumerStats,
  CreateConsumerResponse,
  DeleteConsumerResponse,
  PauseResponse,
  ResumeResponse,
  StartFromProgress,
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

/** The worst case a topic selector admits. */
const maxSelectorStreams = 2000;

/**
 * The ceiling this suite holds the banner to. Deliberately NOT the component's own preview size:
 * a test that imported that constant would move its goalpost along with the code and could never
 * go red for rendering more.
 */
const maxRenderedTopics = 10;

/** What the server names: `<consumer name>@<topic fqn>`. The banner shows the TOPIC half. */
const abandonedStreams = (count: number) =>
  Array.from({ length: count }, (_, i) => `dekaf-session@persistent://public/default/silent-topic-${i}`);

const topicOf = (streamId: string) => streamId.slice(streamId.indexOf('@') + 1);

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

/**
 * A resume frame reporting a FINISHED but degraded start-from resolution: the skip panel is gone
 * (`complete`), and what remains is the record of the streams the resolution gave up on.
 */
const degradedFrame = (streams: string[]) => {
  const progress = new StartFromProgress();
  progress.setComplete(true);
  progress.setDegraded(true);
  progress.setAbandonedStreamsList(streams);
  return new ResumeResponse()
    .setStatus(status(Code.OK))
    .setConsumerStats(new ConsumerStats().setStartFromProgress(progress));
};

/** Renders the session, plays it, and delivers one degraded start-from report. */
const renderDegradedSession = async (streams: string[]) => {
  const stream = fakeResumeStream();
  const okStatus = { getStatus: () => ({ getCode: () => Code.OK, getMessage: () => '' }) };
  mockClients.current = {
    consumerServiceClient: {
      createConsumer: () => Promise.resolve(new CreateConsumerResponse().setStatus(status(Code.OK))),
      resume: () => stream,
      pause: () => Promise.resolve(new PauseResponse().setStatus(status(Code.OK))),
      deleteConsumer: () => Promise.resolve(new DeleteConsumerResponse()),
      getTopicPositions: () => Promise.reject(new Error('not used by these tests')),
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

  await act(async () => {
    stream.emit('data', degradedFrame(streams));
  });
};

const banner = () => screen.getByTestId('cs-start-from-degraded');
/** The topic names the banner actually put in the document. */
const renderedTopics = () => Array.from(banner().querySelectorAll('li')).map((li) => li.textContent);
const click = async (testId: string) => {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId));
  });
};

describe('the start-position degradation banner', () => {
  /** Whatever the copy affordance handed to the clipboard. */
  let clipboardWrites: string[] = [];

  beforeEach(() => {
    clipboardWrites = [];
    // `copyToClipboard` takes the modern path only in a secure context; jsdom provides neither the
    // flag nor a clipboard, and its `execCommand` fallback does not exist either.
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          clipboardWrites.push(text);
          return Promise.resolve();
        },
      },
    });
    window.localStorage.clear();
    // The Tools panel opens by default; nothing here needs it on screen.
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsOpen, 'false');
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('does not build one row per abandoned stream at selector scale', async () => {
    // The defect: a 2,000-stream selector produced a ~2,000-node banner subtree, disclosed by
    // default, on a session that is already degraded and under load.
    await renderDegradedSession(abandonedStreams(maxSelectorStreams));

    expect(renderedTopics().length).toBeLessThanOrEqual(maxRenderedTopics);
    // ...and nothing else in the banner scales with the abandoned list either.
    expect(banner().querySelectorAll('*').length).toBeLessThanOrEqual(4 * maxRenderedTopics);
  });

  it('still states the true number of silent topics, not the number it rendered', async () => {
    await renderDegradedSession(abandonedStreams(maxSelectorStreams));

    expect(banner().textContent).toContain(String(maxSelectorStreams));
  });

  it('stays disclosed and collapsible - the degradation is not hidden behind a click', async () => {
    await renderDegradedSession(abandonedStreams(maxSelectorStreams));

    // Expanded is the default: the compact toggle is what a COLLAPSED banner shows.
    expect(screen.queryByTestId('cs-start-from-degraded-expand')).not.toBeInTheDocument();
    expect(screen.getByTestId('cs-start-from-degraded-topics')).toBeInTheDocument();
    expect(renderedTopics().length).toBeGreaterThan(0);

    await click('cs-start-from-degraded-collapse');
    expect(screen.getByTestId('cs-start-from-degraded-expand')).toBeInTheDocument();

    await click('cs-start-from-degraded-expand');
    expect(screen.getByTestId('cs-start-from-degraded-topics')).toBeInTheDocument();
  });

  it('offers the rest of the list, counted, and shows every name when asked', async () => {
    const streams = abandonedStreams(maxSelectorStreams);
    await renderDegradedSession(streams);

    const previewed = renderedTopics().length;
    // Without this the assertion below is vacuous: a banner that rendered everything would offer
    // "and 0 more" and satisfy it.
    expect(previewed).toBeLessThan(maxSelectorStreams);
    const showAll = screen.getByTestId('cs-start-from-degraded-show-all');
    // The affordance has to name what is still out of view, or the bound silently loses names.
    expect(showAll.textContent).toContain(String(maxSelectorStreams - previewed));

    await click('cs-start-from-degraded-show-all');

    expect(renderedTopics()).toEqual(streams.map(topicOf));
  });

  it('copies every abandoned topic, not only the ones on screen', async () => {
    const streams = abandonedStreams(maxSelectorStreams);
    await renderDegradedSession(streams);

    await click('cs-start-from-degraded-copy');

    expect(clipboardWrites).toHaveLength(1);
    expect(clipboardWrites[0]!.split('\n')).toEqual(streams.map(topicOf));
  });

  it('shows a short list in full, with no "more" affordance to click', async () => {
    const streams = abandonedStreams(3);
    await renderDegradedSession(streams);

    expect(renderedTopics()).toEqual(streams.map(topicOf));
    expect(screen.queryByTestId('cs-start-from-degraded-show-all')).not.toBeInTheDocument();
  });
});
