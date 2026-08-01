/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * Session LIFECYCLE, driven through the real component: pause, the resume stream's failure modes,
 * and what Play does with a configuration that cannot be converted.
 *
 * Everything here is about the session claiming a state the SERVER is not in, which is only
 * observable where the state machine, the RPCs and the stream meet - so the component is rendered
 * for real and only the gRPC transport is replaced. `data-cs-state` on the session container is the
 * state machine's own output, and it is what the Playwright specs assert too.
 *
 * The transport stub answers with genuine protobuf responses; the resume stream is a hand-rolled
 * emitter with the same `on`/`removeListener`/`cancel` surface grpc-web's ClientReadableStream has,
 * so listeners the component never installs simply never fire - exactly as in the browser.
 *
 * Note: with a jest.mock() in the file, esbuild-jest runs babel's hoisting pass over untyped JS, so
 * imported bindings must not appear in type annotations here (inference only).
 */
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));

// There is no gRPC endpoint in jsdom, and the generated clients would try to reach one on import.
// The holder is mutable so each test installs its own answers; the name has to start with `mock`
// for jest's out-of-scope check to allow it inside the hoisted factory.
const mockClients = { current: undefined as unknown };
jest.mock('../../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current,
}));

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ConsumerSession from './ConsumerSession';
import { getDefaultManagedItem } from '../LibraryBrowser/default-library-items';
import { defaultNumDisplayItems } from './SessionConfiguration/display-items';
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

const topicContext = (topicPersistency: 'persistent' | 'non-persistent') => ({
  pulsarResource: {
    type: 'topic' as const,
    tenant: 'public',
    namespace: 'default',
    topicPersistency,
    topic: 'a-topic',
  },
});

const status = (code: number, message: string) => {
  const s = new Status();
  s.setCode(code);
  s.setMessage(message);
  return s;
};

/** The `on`/`removeListener`/`cancel` surface of a grpc-web ClientReadableStream, plus an emitter. */
const fakeResumeStream = () => {
  const listeners: Record<string, ((v: unknown) => void)[]> = {};
  let isCancelled = false;

  return {
    get isCancelled() {
      return isCancelled;
    },
    on(event: string, cb: (v: unknown) => void) {
      (listeners[event] = listeners[event] || []).push(cb);
      return this;
    },
    removeListener(event: string, cb: (v: unknown) => void) {
      listeners[event] = (listeners[event] || []).filter((it) => it !== cb);
      return this;
    },
    cancel() {
      isCancelled = true;
    },
    /** What the server said, delivered to whoever is listening - nobody, if nobody listens. */
    emit(event: string, v?: unknown) {
      (listeners[event] || []).slice().forEach((cb) => cb(v));
    },
  };
};

type HarnessOptions = {
  pauseWith?: { code: number; message: string };
  pauseRejectsWith?: Error;
  createConsumerWith?: { code: number; message: string };
  /** Per-attempt Create statuses; attempts past the end of the list succeed. */
  createConsumerStatuses?: { code: number; message: string }[];
  createRejectsWith?: Error;
  /**
   * Hold every Create open until `settleCreates()` - the server is still building the consumer.
   * That window is where Stop, a hidden tab and an unload all have to behave.
   */
  deferCreate?: boolean;
};

const makeHarness = (options: HarnessOptions = {}) => {
  const stream = fakeResumeStream();
  const createConsumerRequests: any[] = [];
  const deleteConsumerRequests: any[] = [];
  const pauseRequests: any[] = [];
  const resumeRequests: any[] = [];
  const resumeOptions: any[] = [];
  const notifiedErrors: string[] = [];
  const heldCreates: (() => void)[] = [];

  const consumerServiceClient = {
    createConsumer: (req: unknown) => {
      const attempt = createConsumerRequests.length;
      createConsumerRequests.push(req);
      if (options.createRejectsWith !== undefined) {
        return Promise.reject(options.createRejectsWith);
      }
      const res = new CreateConsumerResponse();
      const s = options.createConsumerStatuses?.[attempt]
        ?? options.createConsumerWith
        ?? { code: Code.OK, message: '' };
      res.setStatus(status(s.code, s.message));
      if (!options.deferCreate) {
        return Promise.resolve(res);
      }
      return new Promise((resolve) => heldCreates.push(() => resolve(res)));
    },
    resume: (req: unknown, opts: unknown) => {
      resumeRequests.push(req);
      resumeOptions.push(opts);
      return stream;
    },
    pause: (req: unknown) => {
      pauseRequests.push(req);
      if (options.pauseRejectsWith !== undefined) {
        return Promise.reject(options.pauseRejectsWith);
      }
      const res = new PauseResponse();
      const s = options.pauseWith ?? { code: Code.OK, message: '' };
      res.setStatus(status(s.code, s.message));
      return Promise.resolve(res);
    },
    deleteConsumer: (req: unknown) => {
      deleteConsumerRequests.push(req);
      return Promise.resolve(new DeleteConsumerResponse());
    },
    // The target editor asks for the topics a selector resolves to; nothing here depends on it.
    resolveTopicSelector: () => Promise.reject(new Error('not used by these tests')),
  };

  mockClients.current = {
    consumerServiceClient,
    // The Console's Produce tab creates a producer as soon as the session renders.
    producerServiceClient: {
      createProducer: () => Promise.resolve({ getStatus: () => status(Code.OK, '') }),
      deleteProducer: () => Promise.resolve({ getStatus: () => status(Code.OK, '') }),
      send: () => Promise.resolve({ getStatus: () => status(Code.OK, '') }),
    },
    libraryServiceClient: {
      listLibraryItems: () => Promise.reject(new Error('no library in these tests')),
      getLibraryItem: () => Promise.reject(new Error('no library in these tests')),
    },
  };

  return {
    stream,
    createConsumerRequests,
    deleteConsumerRequests,
    pauseRequests,
    resumeRequests,
    resumeOptions,
    notifiedErrors,
    /** The Create the server was still working on finally answers. */
    settleCreates: async () => {
      await act(async () => {
        heldCreates.splice(0).forEach((resolve) => resolve());
      });
    },
  };
};

const defaultConfig = (context: ReturnType<typeof topicContext>) => ({
  type: 'value' as const,
  val: getDefaultManagedItem('consumer-session-config', context),
});

/** Renders the session; `rerenderWith` re-renders it in place, as a route change would. */
const renderSession = async (config: unknown, context: ReturnType<typeof topicContext>) => {
  const tree = (ctx: ReturnType<typeof topicContext>) => (
    <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
      <ConsumerSession initialConfig={config as never} libraryContext={ctx} />
    </SWRConfig>
  );

  let rerender: any;
  await act(async () => {
    ({ rerender } = render(tree(context)));
  });

  return {
    rerenderWith: async (ctx: ReturnType<typeof topicContext>) => {
      await act(async () => {
        rerender(tree(ctx));
      });
    },
  };
};

const sessionState = () => screen.getByTestId('cs-session').getAttribute('data-cs-state');
const playButton = () => screen.getByTestId('cs-play') as HTMLButtonElement;
const stopButton = () => screen.getByTestId('cs-stop') as HTMLButtonElement;
const clickPlay = async () => {
  await act(async () => {
    fireEvent.click(playButton());
  });
};

/** Stop and flush: the session is remounted from scratch under a new key. */
const clickStop = async () => {
  await act(async () => {
    fireEvent.click(stopButton());
  });
};

/** Play once from `new`, and wait for the create+resume round trip that lands it in `running`. */
const startSession = async () => {
  await clickPlay();
  expect(sessionState()).toBe('running');
};

/** What `document.visibilityState` reports, plus the event the browser fires when it changes. */
const setTabHidden = async (isHidden: boolean) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (isHidden ? 'hidden' : 'visible'),
  });
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'));
  });
};

const consumerNames = (requests: any[]) => requests.map((req) => req.getConsumerName());

describe('a pause the server refuses', () => {
  it('does not present the session as paused', async () => {
    // FAILED_PRECONDITION is what ConsumerServiceImpl.pause answers for a session it no longer
    // knows - and it comes back as a RESOLVED response, not a rejected call. The server stream is
    // still live, so a "paused" label would be a claim about the server that is simply false, and
    // messages can still arrive underneath it.
    const harness = makeHarness({ pauseWith: { code: Code.FAILED_PRECONDITION, message: 'No such consumer' } });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await clickPlay();

    expect(sessionState()).not.toBe('paused');
    // ...and it says so: the session is still consuming, which is what the server is doing.
    expect(sessionState()).toBe('running');
    expect(harness.resumeOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('does not present the session as paused when the pause call itself fails', async () => {
    makeHarness({ pauseRejectsWith: new Error('transport down') });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await clickPlay();

    expect(sessionState()).not.toBe('paused');
  });

  it('still pauses when the server confirms it', async () => {
    // The counterpart: the ordinary path must keep working, or "never claim paused" would be
    // trivially satisfiable by never pausing at all.
    makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await clickPlay();

    expect(sessionState()).toBe('paused');
  });
});

describe('the resume stream ending under the session', () => {
  it('leaves a recoverable state when the stream errors, instead of a frozen "running"', async () => {
    // A transport failure, a cancelled server call or an expired deadline all arrive as `error`.
    // With no listener for it the session sits in `running` for ever, counters frozen, waiting for
    // messages that can no longer come.
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('error', { code: 14, message: 'transport is closing' });
    });

    expect(sessionState()).not.toBe('running');
  });

  it('leaves a recoverable state when the stream ends normally', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('end');
    });

    expect(sessionState()).not.toBe('running');
  });

  it('does not cap the stream with a deadline a long skip would outlive', async () => {
    // Resume is a long-lived server stream: a Skip-N over millions of messages can spend longer
    // than any fixed budget resolving before it delivers anything, and the deadline would kill it
    // mid-skip.
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    expect(harness.resumeOptions).toHaveLength(1);
    expect(harness.resumeOptions[0]?.deadline).toBeUndefined();
  });
});

describe('a configuration Play cannot execute', () => {
  // Shape-check-passing but not convertible: `pauseTriggerChain` is missing, so
  // consumerSessionConfigFromValOrRef throws and the session has no runtime config to send.
  const unconvertibleConfig = () => {
    const config = defaultConfig(topicContext('persistent'));
    const spec = { ...(config.val as any).spec };
    delete spec.pauseTriggerChain;
    return { type: 'value' as const, val: { ...(config.val as any), spec } };
  };

  it('disables Play instead of letting the session hang on "initializing"', async () => {
    makeHarness();
    await renderSession(unconvertibleConfig(), topicContext('persistent'));

    expect(playButton().disabled).toBe(true);
  });

  it('never asks the server to create a consumer it has no config for', async () => {
    const harness = makeHarness();
    await renderSession(unconvertibleConfig(), topicContext('persistent'));

    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(0);
    expect(sessionState()).not.toBe('initializing');
  });

  /** The same default config, with the start-from replaced by a message id of `hexString`. */
  const messageIdConfig = (hexString: string) => {
    const config = defaultConfig(topicContext('persistent'));
    const startFrom = (config.val as any).spec.startFrom;
    startFrom.val.spec.startFrom = {
      type: 'messageId',
      messageId: {
        type: 'value',
        val: {
          metadata: { id: 'mid-1', name: '', descriptionMarkdown: '', type: 'message-id' },
          spec: { hexString },
        },
      },
    };
    return config;
  };

  it.each([[''], ['   ']])('never sends a message-id start-from of %p as zero bytes', async (hexString) => {
    // The shared hex parser reads blank text as an EMPTY byte array - correct for a byte payload,
    // meaningless as a start position. The server parses the field as a real message id and refuses
    // it, so the round trip is spent to end up back where Play started, with nothing on screen
    // saying which field was at fault.
    const harness = makeHarness();
    await renderSession(messageIdConfig(hexString), topicContext('persistent'));

    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(0);
    expect(sessionState()).not.toBe('initializing');
    expect(playButton().disabled).toBe(false);
  });

  it('still sends a message id that is actually filled in', async () => {
    const harness = makeHarness();
    await renderSession(messageIdConfig('08 c3 03 10 cd 04 20 00 30 01'), topicContext('persistent'));

    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(1);
    expect(sessionState()).toBe('running');
  });

  it('recovers from a configuration that cannot be serialised into a request', async () => {
    // A message id that is not hex. The runtime config converts fine - the id is still just text at
    // that point - and the hex parser only runs while the create request is being built, after the
    // click and outside any catch. The session was left sitting on "initializing" for ever.
    const config = defaultConfig(topicContext('persistent'));
    const startFrom = (config.val as any).spec.startFrom;
    startFrom.val.spec.startFrom = {
      type: 'messageId',
      messageId: {
        type: 'value',
        val: {
          metadata: { id: 'mid-1', name: '', descriptionMarkdown: '', type: 'message-id' },
          spec: { hexString: 'zz' },
        },
      },
    };

    const harness = makeHarness();
    await renderSession(config, topicContext('persistent'));

    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(0);
    expect(sessionState()).not.toBe('initializing');
  });

  it('keeps Play working for a configuration that does convert', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    expect(playButton().disabled).toBe(false);
    await clickPlay();
    expect(harness.createConsumerRequests).toHaveLength(1);
  });
});

describe('the topic the session is mounted on', () => {
  /** The topic FQNs the request's first target resolved "the current topic" to. */
  const requestedTopicFqns = (req: any) =>
    req
      .getConsumerSessionConfig()
      .getTargetsList()[0]
      .getTopicSelector()
      .getMultiTopicSelector()
      .getTopicFqnsList();

  it('sends the topic currently being viewed, not the one it was first rendered with', async () => {
    // `persistent://t/n/x` and `non-persistent://t/n/x` are two different topics that differ only
    // in the scheme. Navigating from one to the other changes nothing else about the page, so a
    // session that captured the FQN once keeps consuming the topic the user left.
    const harness = makeHarness();
    const { rerenderWith } = await renderSession(
      defaultConfig(topicContext('persistent')),
      topicContext('persistent')
    );

    await rerenderWith(topicContext('non-persistent'));
    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(1);
    expect(requestedTopicFqns(harness.createConsumerRequests[0])).toEqual([
      'non-persistent://public/default/a-topic',
    ]);
  });

  it('sends the mounted topic when nothing moved', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();

    expect(requestedTopicFqns(harness.createConsumerRequests[0])).toEqual([
      'persistent://public/default/a-topic',
    ]);
  });
});

/**
 * A Create that does not succeed leaves NOTHING running - no consumer on the server, no stream, no
 * timer. The only thing left is the session's own claim about itself, and `initializing` is a claim
 * that something is still happening. Play is disabled there, so the claim is also a dead end: the
 * only way out was Stop, which throws away the loaded messages.
 */
describe('a Create the server does not complete', () => {
  it('returns to a state Play can retry after a refused Create, instead of hanging on "initializing"', async () => {
    // FAILED_PRECONDITION is what ConsumerServiceImpl answers for a config it cannot act on (an
    // empty message id, a topic that vanished) - a RESOLVED response carrying a non-OK status.
    const harness = makeHarness({
      createConsumerWith: { code: Code.FAILED_PRECONDITION, message: 'Message ID is empty' },
    });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(1);
    expect(sessionState()).not.toBe('initializing');
    expect(playButton().disabled).toBe(false);
  });

  it('lets Play actually retry after a refused Create', async () => {
    // Not merely "the button is enabled": the retry has to reach the server, which it cannot do
    // from `initializing` (Play is a no-op there even when it is clickable).
    const harness = makeHarness({
      createConsumerWith: { code: Code.FAILED_PRECONDITION, message: 'Message ID is empty' },
    });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();
    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(2);
  });

  it('returns to a state Play can retry when the Create call itself fails', async () => {
    // A rejected call - transport down, deadline exceeded - never produces a response at all, and
    // the `res === undefined` branch used to return without saying anything about the session.
    const harness = makeHarness({ createRejectsWith: new Error('transport down') });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();

    expect(sessionState()).not.toBe('initializing');
    expect(playButton().disabled).toBe(false);

    await clickPlay();
    expect(harness.createConsumerRequests).toHaveLength(2);
  });

  it('still runs the session when the Create succeeds', async () => {
    // The counterpart: "never strand on initializing" is trivially satisfiable by never starting.
    makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await startSession();
  });
});

/**
 * Stop is enabled while a Create is in flight, and it remounts the whole session. The consumer the
 * server is still building belongs to a UI that no longer exists by the time it exists itself, and
 * its name is generated in the component - so nothing else can ever name it again.
 */
describe('Stop while the session is still being created', () => {
  it('deletes the consumer whose Create landed after the session was abandoned', async () => {
    const harness = makeHarness({ deferCreate: true });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();
    expect(sessionState()).toBe('initializing');
    expect(harness.createConsumerRequests).toHaveLength(1);

    await clickStop();
    const createdName = harness.createConsumerRequests[0].getConsumerName();
    const deletesBeforeCreateLanded = harness.deleteConsumerRequests.length;

    await harness.settleCreates();

    // The server now HAS this consumer, subscribed and consuming. Whatever the unmount already
    // deleted, the late arrival has to be deleted too, or it stays live for ever.
    expect(harness.deleteConsumerRequests.length).toBeGreaterThan(deletesBeforeCreateLanded);
    expect(consumerNames(harness.deleteConsumerRequests.slice(deletesBeforeCreateLanded))).toContain(createdName);
  });

  it('deletes only the abandoned consumer, not the session that replaced it', async () => {
    // Both Creates are in flight at once, and they are indistinguishable from the outside - the
    // deletion has to follow which SESSION asked for each one, not "some create was abandoned".
    const harness = makeHarness({ deferCreate: true });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();
    await clickStop();
    await clickPlay();
    expect(harness.createConsumerRequests).toHaveLength(2);
    const deletesBeforeCreatesLanded = harness.deleteConsumerRequests.length;

    await harness.settleCreates();

    expect(harness.deleteConsumerRequests.length - deletesBeforeCreatesLanded).toBe(1);
    expect(sessionState()).toBe('running');
  });

  it('does not delete the consumer a retry created', async () => {
    // Returning to `new` after a refused Create is itself a cleanup, so a session that retries has
    // been "abandoned" once by the time its second Create lands. Reading that as "this consumer is
    // orphaned" deletes the one consumer the user is actually watching.
    const harness = makeHarness({
      createConsumerStatuses: [{ code: Code.FAILED_PRECONDITION, message: 'Message ID is empty' }],
    });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();
    const deletesBeforeRetry = harness.deleteConsumerRequests.length;

    await clickPlay();

    expect(harness.createConsumerRequests).toHaveLength(2);
    expect(sessionState()).toBe('running');
    expect(harness.deleteConsumerRequests.length).toBe(deletesBeforeRetry);
  });
});

/**
 * The tab going away pauses a RUNNING stream so the browser does not silently stall it. Every other
 * state owns no stream: `new` and `initializing` have no consumer on the server yet, and `paused`
 * already stopped. Pausing those asks the server about a session it does not know, and its refusal
 * used to be read as "then it must still be running".
 */
describe('the tab being hidden', () => {
  afterEach(() => setTabHidden(false));

  it('does not pause a session that was never started', async () => {
    const harness = makeHarness({
      pauseWith: { code: Code.FAILED_PRECONDITION, message: 'No such consumer consumer session' },
    });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await setTabHidden(true);

    expect(harness.pauseRequests).toHaveLength(0);
    // ...and above all it is not "running": a refused pause flipped the session into the one state
    // that offers Resume, for a consumer that was never created.
    expect(sessionState()).toBe('new');
  });

  it('does not pause a session whose Create is still in flight', async () => {
    const harness = makeHarness({ deferCreate: true });
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await clickPlay();
    await setTabHidden(true);

    expect(harness.pauseRequests).toHaveLength(0);
    expect(sessionState()).toBe('initializing');

    // ...and the Create that lands while the tab is STILL HIDDEN must not resume into it: a
    // stream nobody watches, with nothing armed for the return, used to stall the session
    // forever. It parks as a hidden-tab pause instead, and becoming visible resumes it.
    await harness.settleCreates();
    expect(sessionState()).toBe('paused');
    expect(harness.resumeRequests).toHaveLength(0);

    await setTabHidden(false);
    expect(sessionState()).toBe('running');
    expect(harness.resumeRequests).toHaveLength(1);
  });

  it('does not pause a session that is already paused', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();
    await clickPlay();
    expect(sessionState()).toBe('paused');
    const pausesBefore = harness.pauseRequests.length;

    await setTabHidden(true);

    expect(harness.pauseRequests.length).toBe(pausesBefore);
    expect(sessionState()).toBe('paused');
  });

  it('still pauses a running session, and resumes it when the tab comes back', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await setTabHidden(true);
    expect(harness.pauseRequests).toHaveLength(1);
    expect(sessionState()).toBe('paused');

    await setTabHidden(false);
    expect(sessionState()).toBe('running');
  });

  it('leaves a session the user paused paused when the tab comes back', async () => {
    // Coming back must not restart something the USER stopped - only what the hidden tab stopped.
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();
    await clickPlay();
    expect(sessionState()).toBe('paused');

    await setTabHidden(true);
    await setTabHidden(false);

    expect(sessionState()).toBe('paused');
    expect(harness.resumeOptions).toHaveLength(1);
  });
});

/**
 * The retention that keeps a long session from growing until the tab dies. It is the only bound on
 * the message buffer, it runs on a timer rather than per message, and nothing else in the tree
 * exercises it - the count of rendered rows is not the count retained, because the table is
 * virtualized.
 */
describe('the number of messages kept on screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The flush scrolls the table to the bottom; jsdom has no scrollTo on elements.
    (Element.prototype as any).scrollTo = () => undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** The same default config with an explicit display limit. */
  const configWithLimit = (numDisplayItems: number) => {
    const config = defaultConfig(topicContext('persistent'));
    (config.val as any).spec.numDisplayItems = numDisplayItems;
    return config;
  };

  /** A resume response carrying `count` real (valued) messages, numbered from `from`. */
  const messages = (from: number, count: number) => {
    const res = new ResumeResponse();
    res.setStatus(status(Code.OK, ''));
    res.setMessagesList(
      Array.from({ length: count }, (_, i) => {
        const m = new Message();
        m.setValue(new StringValue().setValue(`m-${from + i}`));
        m.setNumMessageProcessed(from + i);
        m.setNumMessageSent(from + i);
        return m;
      })
    );
    return res;
  };

  const retained = () => Number(screen.getByTestId('cs-session').getAttribute('data-cs-retained'));

  /** Let the per-second rate tick, then the flush that moves the buffer into the table. */
  const flush = async () => {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
  };

  it('keeps everything that arrives while the limit is not reached', async () => {
    const harness = makeHarness();
    await renderSession(configWithLimit(5), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('data', messages(1, 3));
    });
    await flush();

    expect(retained()).toBe(3);
  });

  it('drops the oldest once more than the limit has arrived', async () => {
    const harness = makeHarness();
    await renderSession(configWithLimit(5), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('data', messages(1, 12));
    });
    await flush();

    expect(retained()).toBe(5);
  });

  it('keeps the limit across several deliveries, rather than only within one', async () => {
    const harness = makeHarness();
    await renderSession(configWithLimit(5), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('data', messages(1, 4));
    });
    await flush();
    await act(async () => {
      harness.stream.emit('data', messages(5, 4));
    });
    await flush();

    expect(retained()).toBe(5);
  });

  it('still bounds the buffer when the stored limit is one that keeps everything', async () => {
    // A saved session carrying 0 - which is what an emptied field used to commit - turned
    // `slice(-limit)` into `slice(0)`, so "limit num. display messages" removed the only bound the
    // session has and the buffer grew for as long as the session ran.
    //
    // The distinction is only visible ABOVE the default limit, so this delivers past it. It is the
    // one test here that has to: everything smaller passes either way.
    const harness = makeHarness();
    await renderSession(configWithLimit(0), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('data', messages(1, defaultNumDisplayItems + 5));
    });
    await flush();

    expect(retained()).toBe(defaultNumDisplayItems);
  });
});

/**
 * The unload cleanup is a listener on `window`, and `window` outlives every session. Registering it
 * from the initialize path meant nothing ever removed it: each Stop remount left one more stale
 * closure installed, each holding a dead session's consumer name.
 */
describe('the unload cleanup', () => {
  it('deletes only the session that is on screen, however often the session was restarted', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await startSession();
    await clickStop();
    await startSession();
    await clickStop();
    await startSession();

    const deletesBeforeUnload = harness.deleteConsumerRequests.length;
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(harness.deleteConsumerRequests.length - deletesBeforeUnload).toBe(1);
  });

  it('deletes nothing on unload for a session that was never started', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));

    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(harness.deleteConsumerRequests).toHaveLength(0);
  });
});

describe('the browser-wide delivery controls', () => {
  // Both live in localStorage and must be scrubbed, or one test's setting becomes the next
  // test's surprise.
  afterEach(() => window.localStorage.clear());

  /** A data frame whose trailing counters put the LOADED count at `sent`. */
  const dataFrame = (sent: number) => {
    const res = new ResumeResponse();
    res.setStatus(status(Code.OK, ''));
    const msg = new Message();
    const value = new StringValue();
    value.setValue('{"a":1}');
    msg.setValue(value);
    msg.setNumMessageProcessed(sent);
    msg.setNumMessageSent(sent);
    res.setMessagesList([msg]);
    return res;
  };

  it('the rate limit rides every resume request, straight from localStorage', async () => {
    window.localStorage.setItem('consumerSessionRateLimit', '250');
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    expect(harness.resumeRequests).toHaveLength(1);
    expect(harness.resumeRequests[0].getMaxMessagesPerSecond()).toBe(250);
  });

  it('the pause-after threshold rides every resume request as the server-side delivery budget', async () => {
    window.localStorage.setItem('consumerSessionPauseAfterLoaded', '10');
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    // The server enforces "at most 10 loaded on this stream"; the client threshold below is only
    // the state-machine driver that turns the quiet stream into a paused session.
    expect(harness.resumeRequests[0].getMaxMessagesToDeliver()).toBe(10);
  });

  it('no setting means UNLIMITED on the wire - zero, not a stale number', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    expect(harness.resumeRequests[0].getMaxMessagesPerSecond()).toBe(0);
  });

  it('pauses itself when n more messages have loaded - the same pause the button sends', async () => {
    window.localStorage.setItem('consumerSessionPauseAfterLoaded', '3');
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    // Two loaded: below the threshold, nothing happens.
    await act(async () => {
      harness.stream.emit('data', dataFrame(2));
    });
    expect(harness.pauseRequests).toHaveLength(0);
    expect(sessionState()).toBe('running');

    // The third crosses it: the session pauses ITSELF.
    await act(async () => {
      harness.stream.emit('data', dataFrame(3));
    });
    expect(harness.pauseRequests).toHaveLength(1);
    expect(sessionState()).toBe('paused');
  });

  it('one crossing fires exactly one pause, however many chunks arrive during it', async () => {
    window.localStorage.setItem('consumerSessionPauseAfterLoaded', '3');
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    // Both frames are past the threshold; the second lands while the pause is in flight and must
    // not send a second one.
    await act(async () => {
      harness.stream.emit('data', dataFrame(3));
      harness.stream.emit('data', dataFrame(4));
    });

    expect(harness.pauseRequests).toHaveLength(1);
  });

  it('re-arms on resume: Play loads the NEXT n and pauses again', async () => {
    window.localStorage.setItem('consumerSessionPauseAfterLoaded', '3');
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('data', dataFrame(3));
    });
    expect(sessionState()).toBe('paused');

    // Play again: the threshold is re-armed at loaded + n = 6, so 5 is quiet and 6 pauses.
    await clickPlay();
    expect(sessionState()).toBe('running');
    await act(async () => {
      harness.stream.emit('data', dataFrame(5));
    });
    expect(sessionState()).toBe('running');
    await act(async () => {
      harness.stream.emit('data', dataFrame(6));
    });

    expect(harness.pauseRequests).toHaveLength(2);
  });

  it('no threshold set means the session NEVER pauses itself', async () => {
    const harness = makeHarness();
    await renderSession(defaultConfig(topicContext('persistent')), topicContext('persistent'));
    await startSession();

    await act(async () => {
      harness.stream.emit('data', dataFrame(1000));
    });

    expect(harness.pauseRequests).toHaveLength(0);
    expect(sessionState()).toBe('running');
  });
});
