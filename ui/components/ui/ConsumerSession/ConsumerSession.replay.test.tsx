/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The ROW-LEVEL disclosures of the guaranteed replay: the per-row seam-violation marker and the
 * switch-point marker left behind by "Continue live with Best effort".
 *
 * Both live INSIDE the virtualized message table, which jsdom cannot lay out - so, exactly like
 * the columns suite, react-virtuoso is replaced with a plain table that renders every row through
 * the session's own `itemContent`. The rows are the real MessageComponent cells; only the
 * virtualization is gone. That substitution is also why the markers here are DATA-DRIVEN by
 * design: a marker attached to the row's message survives scrolling, retention trimming and
 * re-sorting because it re-renders with the row, wherever the row is.
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

// The message table virtualizes rows and measures its viewport; jsdom lays nothing out, so the
// header AND every row are rendered into a plain table here (the columns suite renders the header
// the same way). `itemContent` is the session's real row renderer.
jest.mock('react-virtuoso', () => {
  const ReactRuntime = require('react');
  return {
    TableVirtuoso: ReactRuntime.forwardRef((props: any, _ref: unknown) =>
      ReactRuntime.createElement(
        'table',
        null,
        ReactRuntime.createElement('thead', null, props.fixedHeaderContent()),
        ReactRuntime.createElement(
          'tbody',
          null,
          (props.data ?? []).map((message: unknown, i: number) =>
            ReactRuntime.createElement('tr', { key: i, 'data-testid': 'cs-rendered-row' }, props.itemContent(i, message)))
        )
      )),
  };
});

import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ConsumerSession from './ConsumerSession';
import { getDefaultManagedItem } from '../LibraryBrowser/default-library-items';
import { localStorageKeys } from '../../local-storage-keys';
import { Status } from '../../../grpc-web/google/rpc/status_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { Int32Value, StringValue } from 'google-protobuf/google/protobuf/wrappers_pb';
import {
  ConsumerStats,
  CreateConsumerResponse,
  DeleteConsumerResponse,
  Message,
  PauseResponse,
  ResumeResponse,
  SetDeliveryOrderResponse,
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
    cancel() { },
    emit(event: string, v?: unknown) {
      (listeners[event] || []).slice().forEach((cb) => cb(v));
    },
  };
};

/** A valued message numbered `n`, optionally flagged as a cross-seam ordering violation. */
const message = (n: number, opts: { seamViolation?: boolean } = {}) => {
  const m = new Message();
  m.setValue(new StringValue().setValue(`m-${n}`));
  m.setNumMessageProcessed(n);
  m.setNumMessageSent(n);
  // The server stamps every delivered message with its target; the row renderer dereferences it.
  m.setSessionTargetIndex(new Int32Value().setValue(0));
  if (opts.seamViolation) {
    m.setReplaySeamViolation(true);
  }
  return m;
};

const dataFrame = (messages: ReturnType<typeof message>[]) =>
  new ResumeResponse().setStatus(status(Code.OK)).setMessagesList(messages);

/** The message-less stats frame the server pushes when the replay reaches its boundary. */
const caughtUpFrame = () => {
  const stats = new ConsumerStats();
  stats.setDeliveryOrderActive(true);
  stats.setReplayCaughtUp(true);
  stats.setReplayBoundaryAtMs(1_754_700_000_000);
  return new ResumeResponse().setStatus(status(Code.OK)).setConsumerStats(stats);
};

const makeHarness = () => {
  const streams: Array<ReturnType<typeof fakeResumeStream>> = [];
  const okStatus = { getStatus: () => ({ getCode: () => Code.OK, getMessage: () => '' }) };
  mockClients.current = {
    consumerServiceClient: {
      createConsumer: () => Promise.resolve(new CreateConsumerResponse().setStatus(status(Code.OK))),
      resume: () => {
        const stream = fakeResumeStream();
        streams.push(stream);
        return stream;
      },
      pause: () => Promise.resolve(new PauseResponse().setStatus(status(Code.OK))),
      deleteConsumer: () => Promise.resolve(new DeleteConsumerResponse()),
      setDeliveryOrder: () => Promise.resolve(new SetDeliveryOrderResponse().setStatus(status(Code.OK))),
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
  return { streams };
};

/** Renders the session with an explicit Guaranteed order and plays it. */
const renderRunningSession = async () => {
  const harness = makeHarness();
  const config = getDefaultManagedItem('consumer-session-config', topicContext) as {
    spec: { messageDeliveryOrder?: string };
  };
  // Pinned explicitly, like the e2e matrix does: the replay scenarios are Guaranteed's.
  config.spec.messageDeliveryOrder = 'guaranteed';

  await act(async () => {
    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
        <ConsumerSession initialConfig={{ type: 'value', val: config } as never} libraryContext={topicContext} />
      </SWRConfig>
    );
  });

  await act(async () => {
    fireEvent.click(screen.getByTestId('cs-play'));
  });

  return harness;
};

/** Let the per-second gauge tick, then the flush that moves the buffer into the table. */
const flush = async () => {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
};

const sessionState = () => screen.getByTestId('cs-session').getAttribute('data-cs-state');
const rowTexts = () => screen.getAllByTestId('cs-rendered-row').map((row) => row.textContent ?? '');

describe('the per-row seam-violation marker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (Element.prototype as { scrollTo?: () => void }).scrollTo = () => undefined;
    window.localStorage.clear();
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsOpen, 'false');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    window.localStorage.clear();
  });

  it('marks exactly the flagged row, and explains the flag in plain language', async () => {
    const { streams } = await renderRunningSession();

    await act(async () => {
      streams[0].emit('data', dataFrame([message(1), message(2, { seamViolation: true }), message(3)]));
    });
    await flush();

    expect(screen.getAllByTestId('cs-rendered-row')).toHaveLength(3);
    const markers = screen.getAllByTestId('cs-seam-violation-marker');
    expect(markers).toHaveLength(1);
    // The marker sits on the row that carried the flag - m-2, not its neighbours.
    expect(markers[0].closest('tr')?.textContent).toContain('m-2');
    // The explanation is on the marker itself, in the user's terms: a producer clock, not proto
    // field names.
    expect(markers[0].getAttribute('title')).toMatch(/out of order/i);
    expect(markers[0].getAttribute('title')).toMatch(/producer clock/i);
    expect(markers[0].getAttribute('title')).toMatch(/pause/i);
  });

  it('marks nothing when no message carries the flag - absent field means no marker', async () => {
    const { streams } = await renderRunningSession();

    await act(async () => {
      streams[0].emit('data', dataFrame([message(1), message(2)]));
    });
    await flush();

    expect(screen.getAllByTestId('cs-rendered-row')).toHaveLength(2);
    expect(screen.queryByTestId('cs-seam-violation-marker')).toBeNull();
  });
});

/**
 * The switch-point marker (the plan's OPEN DETAIL, decided during this work): after "Continue
 * live with Best effort", rows above the switch are the exact replay and rows below are
 * grace-ordered - the transition may not ship unmarked. The marker is a divider band attached to
 * the FIRST live-delivered row, driven by the session's monotonic processed counter: it renders
 * wherever that row renders, so it survives scrolling, retention trimming and re-sorting rather
 * than being a DOM insertion at a fixed offset.
 */
describe('the delivery-order switch-point marker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (Element.prototype as { scrollTo?: () => void }).scrollTo = () => undefined;
    window.localStorage.clear();
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsOpen, 'false');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    window.localStorage.clear();
  });

  const switchToLive = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('cs-replay-continue-best-effort'));
    });
  };

  it('appears exactly at the transition: the first row delivered after the switch', async () => {
    const { streams } = await renderRunningSession();

    // The replay chunk: two rows, then the boundary.
    await act(async () => {
      streams[0].emit('data', dataFrame([message(1), message(2)]));
    });
    await flush();
    await act(async () => {
      streams[0].emit('data', caughtUpFrame());
    });
    expect(sessionState()).toBe('paused');

    await switchToLive();
    expect(sessionState()).toBe('running');

    // Live rows arrive on the NEW stream - the switch resumed delivery.
    await act(async () => {
      streams[streams.length - 1].emit('data', dataFrame([message(3), message(4)]));
    });
    await flush();

    expect(rowTexts()).toHaveLength(4);
    const markers = screen.getAllByTestId('cs-order-switch-point');
    expect(markers).toHaveLength(1);
    // On the first LIVE row - m-3 - not on the last replay row and not on later live rows.
    expect(markers[0].closest('tr')?.textContent).toContain('m-3');
    expect(markers[0].closest('tr')?.textContent).not.toContain('m-2');
  });

  it('stays on that row as more live rows arrive - one transition, one marker', async () => {
    const { streams } = await renderRunningSession();

    await act(async () => {
      streams[0].emit('data', dataFrame([message(1)]));
    });
    await flush();
    await act(async () => {
      streams[0].emit('data', caughtUpFrame());
    });
    await switchToLive();

    await act(async () => {
      streams[streams.length - 1].emit('data', dataFrame([message(2)]));
    });
    await flush();
    await act(async () => {
      streams[streams.length - 1].emit('data', dataFrame([message(3), message(4)]));
    });
    await flush();

    const markers = screen.getAllByTestId('cs-order-switch-point');
    expect(markers).toHaveLength(1);
    expect(markers[0].closest('tr')?.textContent).toContain('m-2');
  });

  it('marks nothing while the session never switched', async () => {
    const { streams } = await renderRunningSession();

    await act(async () => {
      streams[0].emit('data', dataFrame([message(1), message(2)]));
    });
    await flush();

    expect(screen.queryByTestId('cs-order-switch-point')).toBeNull();
  });

  it('does not survive into the next session - Stop clears the record with the table', async () => {
    const { streams } = await renderRunningSession();

    await act(async () => {
      streams[0].emit('data', dataFrame([message(1)]));
    });
    await flush();
    await act(async () => {
      streams[0].emit('data', caughtUpFrame());
    });
    await switchToLive();
    await act(async () => {
      streams[streams.length - 1].emit('data', dataFrame([message(2)]));
    });
    await flush();
    expect(screen.getAllByTestId('cs-order-switch-point')).toHaveLength(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId('cs-stop'));
    });

    expect(screen.queryByTestId('cs-order-switch-point')).toBeNull();
  });
});
