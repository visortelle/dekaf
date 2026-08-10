/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The Topic Positions tab as a component, now built on the shared Table: what it polls, when it
 * polls at all, and what it renders for each answer. The loader's TRANSITIONS (keep-last-good,
 * error recovery, vanished session) are pinned in topic-positions.spec.ts against the extracted
 * loader; here the wiring is pinned - gating by tab visibility and session state, the deadline
 * on the RPC, the aggregate row reaching the screen.
 */
const mockClients = { current: undefined as unknown };
jest.mock('../../../../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current
}));

const mockNotifications = {
  current: {
    notifySuccess: jest.fn(),
    notifyInfo: jest.fn(),
    notifyWarn: jest.fn(),
    notifyError: jest.fn()
  }
};
jest.mock('../../../../app/contexts/Notifications', () => ({
  useContext: () => mockNotifications.current
}));

const mockClipboardWriteText = jest.fn<Promise<void>, [string]>();

// The production table virtualizes rows. jsdom has no layout, so render the same headers/cells in
// a plain table here; this lets the component suite pin which values reach the screen without
// pretending at viewport measurements.
jest.mock('react-virtuoso', () => {
  const ReactRuntime = require('react');
  return {
    TableVirtuoso: (props: any) =>
      ReactRuntime.createElement(
        'table',
        null,
        ReactRuntime.createElement('thead', null, props.fixedHeaderContent()),
        ReactRuntime.createElement(
          'tbody',
          null,
          props.data.map((entry: any, index: number) => ReactRuntime.createElement('tr', { key: index }, props.itemContent(index, entry)))
        )
      )
  };
});

// react-virtuoso (inside the shared Table) measures itself with ResizeObserver, which jsdom does
// not provide. A no-op stand-in is enough: nothing here asserts on measured sizes.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import TopicPositions from './TopicPositions';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';

// With jest.mock in the file, esbuild-jest runs babel's hoisting over untyped JS, so imported
// bindings must not appear in type annotations here (the lifecycle suite documents the same
// constraint) - hence the inlined literal union instead of the imported SessionState.
type SessionStateLiteral = 'new' | 'initializing' | 'running' | 'pausing' | 'paused';

const statusOf = (code: number, message = '') => ({
  getCode: () => code,
  getMessage: () => message
});

type FakePosition = {
  getTopicFqn: () => string;
  getFirstMessageId: () => { getValue_asU8: () => Uint8Array } | undefined;
  getFirstPublishTime: () => { getValue: () => number } | undefined;
  getLastMessageId: () => { getValue_asU8: () => Uint8Array } | undefined;
  getLastPublishTime: () => { getValue: () => number } | undefined;
  getFirstConsumedMessageId: () => { getValue_asU8: () => Uint8Array } | undefined;
  getFirstConsumedPublishTime: () => { getValue: () => number } | undefined;
  getCursorMessageId: () => { getValue_asU8: () => Uint8Array } | undefined;
  getCursorPublishTime: () => { getValue: () => number } | undefined;
  getCursorTimeFraction: () => { getValue: () => number } | undefined;
  getCursorEntryFraction: () => { getValue: () => number } | undefined;
  getCursorEntryOrdinal: () => { getValue: () => number } | undefined;
  getRetainedEntries: () => { getValue: () => number } | undefined;
  getUnavailableReason: () => { getValue: () => string } | undefined;
};

type PositionOverrides = {
  firstId?: number[];
  first?: number;
  lastId?: number[];
  last?: number;
  firstConsumed?: number;
  lastConsumed?: number;
  firstConsumedId?: number[];
  lastConsumedId?: number[];
  ordinal?: number;
  retained?: number;
  timeFraction?: number;
  entryFraction?: number;
  unavailableReason?: string;
};

const position = (fqn: string, over: PositionOverrides = {}): FakePosition => ({
  getTopicFqn: () => fqn,
  getFirstMessageId: () =>
    over.firstId === undefined ? undefined : { getValue_asU8: () => new Uint8Array(over.firstId as number[]) },
  getFirstPublishTime: () => (over.first === undefined ? undefined : { getValue: () => over.first as number }),
  getLastMessageId: () =>
    over.lastId === undefined ? undefined : { getValue_asU8: () => new Uint8Array(over.lastId as number[]) },
  getLastPublishTime: () => (over.last === undefined ? undefined : { getValue: () => over.last as number }),
  getFirstConsumedMessageId: () =>
    over.firstConsumedId === undefined ? undefined : { getValue_asU8: () => new Uint8Array(over.firstConsumedId as number[]) },
  getFirstConsumedPublishTime: () =>
    over.firstConsumed === undefined ? undefined : { getValue: () => over.firstConsumed as number },
  getCursorMessageId: () =>
    over.lastConsumedId === undefined ? undefined : { getValue_asU8: () => new Uint8Array(over.lastConsumedId as number[]) },
  getCursorPublishTime: () =>
    over.lastConsumed === undefined ? undefined : { getValue: () => over.lastConsumed as number },
  getCursorTimeFraction: () =>
    over.timeFraction === undefined ? undefined : { getValue: () => over.timeFraction as number },
  getCursorEntryFraction: () =>
    over.entryFraction === undefined ? undefined : { getValue: () => over.entryFraction as number },
  getCursorEntryOrdinal: () => (over.ordinal === undefined ? undefined : { getValue: () => over.ordinal as number }),
  getRetainedEntries: () => (over.retained === undefined ? undefined : { getValue: () => over.retained as number }),
  getUnavailableReason: () =>
    over.unavailableReason === undefined ? undefined : { getValue: () => over.unavailableReason as string }
});

const answer = (code: number, message: string, positions: FakePosition[]) => ({
  getStatus: () => statusOf(code, message),
  getPositionsList: () => positions
});

const withClient = (getTopicPositions: jest.Mock) => {
  mockClients.current = { consumerServiceClient: { getTopicPositions } };
  return getTopicPositions;
};

beforeAll(() => {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => mockClipboardWriteText(text) }
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: jest.fn(() => false) });
});

beforeEach(() => {
  mockClipboardWriteText.mockReset().mockResolvedValue(undefined);
  Object.values(mockNotifications.current).forEach((notify) => notify.mockReset());
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const renderTab = async (sessionState: SessionStateLiteral, isVisible = true) => {
  await act(async () => {
    render(
      // A FRESH SWR cache per test: the Table polls through useSWR, and a shared cache would leak
      // one test's rows into the next.
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
        <TopicPositions consumerName="__dekaf_test" sessionState={sessionState as never} isVisible={isVisible} />
      </SWRConfig>
    );
  });
};

const renderedTopicOrder = (): string[] =>
  Array.from(document.querySelectorAll("[data-testid='topic-positions'] tbody tr td:first-child"))
    .map((cell) => cell.textContent?.trim() ?? '');

const header = (columnKey: string): HTMLElement =>
  document.querySelector(`[data-testid='table-th'][data-column-key='${columnKey}']`) as HTMLElement;

describe('when the tab may not poll', () => {
  it('session not started: no RPC at all - nothing exists to ask about', async () => {
    // The poll is simply not armed before Play, which is cheaper than polling into a server
    // refusal and cannot leak an internal session name.
    const rpc = withClient(jest.fn());
    await renderTab('new');

    expect(screen.getByTestId('topic-positions-not-started')).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hidden tab: no polling - only the tab on screen pays the broker cost', async () => {
    const rpc = withClient(jest.fn());
    await renderTab('running', false);

    expect(rpc).not.toHaveBeenCalled();
  });

  it('stops periodic requests while hidden and resumes only when visible again', async () => {
    const rpc = withClient(jest.fn().mockResolvedValue(answer(Code.OK, '', [position('persistent://t/n/a')])));
    const cache = new Map();
    const swr = { provider: () => cache, dedupingInterval: 0, revalidateOnFocus: false };
    const tab = (isVisible: boolean) => (
      <SWRConfig value={swr}>
        <TopicPositions consumerName="__dekaf_test" sessionState={'running' as never} isVisible={isVisible} />
      </SWRConfig>
    );

    let rerenderTab: (isVisible: boolean) => void = () => undefined;
    await act(async () => {
      const view = render(tab(true));
      rerenderTab = (isVisible) => view.rerender(tab(isVisible));
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));

    await act(async () => {
      rerenderTab(false);
    });
    const callsWhenHidden = rpc.mock.calls.length;

    // More than two refresh periods: an accidentally live interval would reliably fire here.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2200));
    });
    expect(rpc).toHaveBeenCalledTimes(callsWhenHidden);

    await act(async () => {
      rerenderTab(true);
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(callsWhenHidden + 1));
  });
});

describe('a polling tab', () => {
  it('renders every topic plus the ALL TOPICS aggregate, and asks with a DEADLINE', async () => {
    const rpc = withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position('persistent://t/n/a', { first: 1000, last: 2000, lastConsumed: 1500, ordinal: 5, retained: 10 }),
          position('persistent://t/n/b', { first: 1200, last: 2400, lastConsumed: 1300, ordinal: 2, retained: 10 })
        ])
      )
    );
    await renderTab('running');

    // The small Virtuoso stand-in above renders the rows without layout. The accounting gives us
    // one compact assertion that both topic rows plus the aggregate reached the shared Table.
    // The count is split across <strong> elements, so match on the flattened text.
    await waitFor(() => expect(document.body.textContent).toContain('3 of 3 topics'));

    // The deadline is what keeps one hung RPC from wedging the poll forever.
    const opts = rpc.mock.calls[0][1];
    expect(opts?.deadline).toBeDefined();
  });

  it('renders every cell in the All topics aggregate row in bold', async () => {
    withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position('persistent://t/n/a', { first: 1000, last: 2000, lastConsumed: 1500, ordinal: 5, retained: 10 }),
          position('persistent://t/n/b', { first: 1200, last: 2400, lastConsumed: 1300, ordinal: 2, retained: 10 })
        ])
      )
    );
    await renderTab('running');

    await waitFor(() => expect(renderedTopicOrder()[0]).toBe('All topics'));
    const rows = Array.from(document.querySelectorAll("[data-testid='topic-positions'] tbody tr"));
    const aggregateCells = Array.from(rows[0].querySelectorAll('td'));
    expect(aggregateCells).toHaveLength(14);
    aggregateCells.forEach((cell) => {
      const content = cell.querySelector<HTMLElement>("[data-testid='topic-positions-aggregate-cell']");
      expect(content).not.toBeNull();
      expect(content?.style.fontWeight).toBe('var(--font-weight-bold)');
    });

    expect(rows[1].querySelector("[data-testid='topic-positions-aggregate-cell']")).toBeNull();
  });

  it('renders consumed bounds even when broker endpoint inspection is unavailable', async () => {
    withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position('non-persistent://t/n/live', {
            firstConsumed: 1000,
            lastConsumed: 2000,
            firstConsumedId: [1, 2],
            lastConsumedId: [3, 4],
            unavailableReason: 'Endpoint inspection is unavailable'
          })
        ])
      )
    );
    await renderTab('running');

    await waitFor(() => expect(document.body.textContent).toContain('01 02'));
    expect(document.body.textContent).toContain('03 04');
    expect(document.body.textContent).toContain(new Date(1000).toLocaleString());
    expect(document.body.textContent).toContain(new Date(2000).toLocaleString());
    expect(document.body.textContent).toContain('Endpoint inspection is unavailable');
  });

  it('a session that vanished mid-run ends the view without a crash or a stale-data banner', async () => {
    withClient(jest.fn().mockResolvedValue(answer(Code.FAILED_PRECONDITION, 'no such session', [])));
    await renderTab('running');

    // Not the stale-data banner: nothing on screen is stale, the session is simply over. What it
    // stops doing - polling - is pinned under fake timers below.
    await waitFor(() => expect(screen.getByTestId('topic-positions-session-gone')).toBeTruthy());
    expect(screen.queryByTestId('topic-positions-error')).toBeNull();
    expect(document.body.textContent).toContain('no such session');
  });

  it('a transport failure surfaces as the stale-data banner, not a throw', async () => {
    withClient(jest.fn().mockRejectedValue(new Error('connection refused')));
    await renderTab('running');

    await waitFor(() => expect(screen.getByTestId('topic-positions-error')).toBeTruthy());
    expect(screen.getByTestId('topic-positions-error').textContent).toContain('connection refused');
    expect(screen.getByTestId('topic-positions-error').textContent).toContain('showing the last data');
  });
});

/**
 * A session the server no longer has is TERMINAL. The server answers FAILED_PRECONDITION for a
 * deleted/ended session precisely so the browser stops asking; treating it as "no rows" left the
 * tab scanning a session that does not exist, once a second, forever, behind a blank table that
 * looked like a session with nothing to report.
 *
 * These use FAKE TIMERS and walk SEVERAL refresh periods: a single tick cannot tell a stopped
 * poll from a slow one. The CONTROL case below is what makes the rest meaningful - it proves this
 * harness really does drive the 1-second auto-refresh, so "no further calls" is evidence.
 */
describe('a session that vanished mid-run', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  const renderPolling = async (rpc: jest.Mock) => {
    withClient(rpc);
    await act(async () => {
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
          <TopicPositions consumerName="__dekaf_test" sessionState={'running' as never} isVisible />
        </SWRConfig>
      );
    });
  };

  /** One auto-refresh period, plus the promise turns SWR needs to settle the answer it triggers. */
  const tick = async () => {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const gone = (message: string) => answer(Code.FAILED_PRECONDITION, message, []);
  const ok = (...fqns: string[]) => answer(Code.OK, '', fqns.map((fqn) => position(fqn)));

  it('CONTROL: a live session is polled once per refresh period, tick after tick', async () => {
    const rpc = jest.fn().mockResolvedValue(ok('persistent://t/n/a'));
    await renderPolling(rpc);

    expect(rpc).toHaveBeenCalledTimes(1);
    await tick();
    expect(rpc).toHaveBeenCalledTimes(2);
    await tick();
    expect(rpc).toHaveBeenCalledTimes(3);
    await tick();
    expect(rpc).toHaveBeenCalledTimes(4);
  });

  it('stops polling for good the moment the server says the session is gone', async () => {
    const rpc = jest.fn().mockResolvedValue(gone('There is no consumer session named __dekaf_test'));
    await renderPolling(rpc);

    expect(rpc).toHaveBeenCalledTimes(1);
    for (let period = 0; period < 6; period += 1) {
      await tick();
    }
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('polls a live session, then stops at the period the session disappears', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValueOnce(ok('persistent://t/n/a', 'persistent://t/n/b'))
      .mockResolvedValueOnce(ok('persistent://t/n/a', 'persistent://t/n/b'))
      .mockResolvedValue(gone('The consumer session has ended'));
    await renderPolling(rpc);

    await tick();
    expect(rpc).toHaveBeenCalledTimes(2);
    await tick();
    expect(rpc).toHaveBeenCalledTimes(3);

    for (let period = 0; period < 5; period += 1) {
      await tick();
    }
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it('says the session ended instead of showing a blank table', async () => {
    const rpc = jest.fn().mockResolvedValue(gone('The consumer session has ended'));
    await renderPolling(rpc);
    await tick();

    const ended = screen.getByTestId('topic-positions-session-gone');
    expect(ended.textContent).toContain('ended');
    expect(ended.textContent).toContain('The consumer session has ended');
    // Not a table with nothing in it, and not the stale-data banner either - nothing is stale,
    // the session is over.
    expect(screen.queryByTestId('topic-positions-table')).toBeNull();
    expect(screen.queryByTestId('topic-positions-error')).toBeNull();
  });

  it('an OK answer with no topics is an EMPTY result, not a vanished session', async () => {
    const rpc = jest.fn().mockResolvedValue(ok());
    await renderPolling(rpc);

    await tick();
    await tick();

    expect(screen.queryByTestId('topic-positions-session-gone')).toBeNull();
    expect(screen.getByTestId('topic-positions-table')).toBeTruthy();
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it('a transport failure is NOT terminal - the poll keeps trying', async () => {
    const rpc = jest.fn().mockRejectedValue(new Error('connection refused'));
    await renderPolling(rpc);

    await tick();
    await tick();

    expect(screen.queryByTestId('topic-positions-session-gone')).toBeNull();
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it('a session started again after the old one ended polls again', async () => {
    // ConsumerSession keeps ONE generated consumer name for its whole lifetime, so Stop/Play
    // reuses it. The terminal state has to clear on the way through 'new', or Topic Positions
    // would stay dead for the rest of the page's life.
    const rpc = jest.fn().mockResolvedValue(gone('The consumer session has ended'));
    withClient(rpc);
    const tab = (sessionState: string) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
        <TopicPositions consumerName="__dekaf_test" sessionState={sessionState as never} isVisible />
      </SWRConfig>
    );

    let rerenderTab: (sessionState: string) => void = () => undefined;
    await act(async () => {
      const view = render(tab('running'));
      rerenderTab = (sessionState) => view.rerender(tab(sessionState));
    });
    await tick();
    expect(screen.getByTestId('topic-positions-session-gone')).toBeTruthy();
    const callsWhileGone = rpc.mock.calls.length;

    rpc.mockResolvedValue(ok('persistent://t/n/a'));
    await act(async () => {
      rerenderTab('new');
    });
    await act(async () => {
      rerenderTab('running');
    });

    expect(screen.queryByTestId('topic-positions-session-gone')).toBeNull();
    await tick();
    expect(rpc.mock.calls.length).toBeGreaterThan(callsWhileGone);
  });
});

describe('column UX', () => {
  it('uses a scan-friendly default order, precise titles, and a real tooltip on every header', async () => {
    withClient(jest.fn().mockResolvedValue(answer(Code.OK, '', [position('persistent://t/n/topic')])));
    await renderTab('running');
    await waitFor(() => expect(header('topic')).toBeTruthy());

    const headers = Array.from(document.querySelectorAll<HTMLElement>("[data-testid='table-th']"));
    expect(headers.map((h) => h.dataset.columnKey)).toEqual([
      'topic',
      'entriesRead',
      'entriesLeft',
      'entryFraction',
      'behind',
      'timeFraction',
      'firstConsumedPublished',
      'firstConsumedMessage',
      'lastConsumedPublished',
      'cursorMessage',
      'firstPublished',
      'firstMessage',
      'lastPublished',
      'lastMessage'
    ]);
    // Jest's SVG transform renders the active sort arrow as the literal "test-file-stub".
    expect(headers.map((h) => h.textContent?.replace(/test-file-stub/g, '').trim())).toEqual([
      'Topic / partition',
      'Stored entry position',
      'Stored entries after position',
      'Stored entry position (%)',
      'Publish-time gap',
      'Publish-time position (%)',
      'Earliest processed publish time',
      'Earliest processed message ID',
      'Furthest processed publish time',
      'Furthest processed message ID',
      'Earliest stored publish time',
      'Earliest stored message ID',
      'Latest stored publish time',
      'Latest stored message ID'
    ]);

    headers.forEach((h) => {
      const help = h.querySelector<HTMLElement>('[data-tooltip-html]')?.dataset.tooltipHtml;
      expect(help?.trim().length).toBeGreaterThan(20);
    });
    expect(header('entriesRead').querySelector<HTMLElement>('[data-tooltip-html]')?.dataset.tooltipHtml).toContain(
      'not how many entries the session read'
    );
    expect(header('behind').querySelector<HTMLElement>('[data-tooltip-html]')?.dataset.tooltipHtml).toContain(
      'not subscription backlog'
    );

    // Message IDs from independent topic logs have no honest shared ordering, so those headers
    // must not pretend to sort their serialized protobuf bytes.
    fireEvent.click(header('firstConsumedMessage'));
    expect(header('firstConsumedMessage').dataset.sortDirection).toBeUndefined();
    expect(header('topic').dataset.sortDirection).toBe('asc');
  });

  it('sorts topic partition suffixes naturally', async () => {
    withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position('persistent://t/n/topic-partition-10'),
          position('persistent://t/n/topic-partition-2')
        ])
      )
    );
    await renderTab('running');

    await waitFor(() =>
      expect(renderedTopicOrder()).toEqual([
        'All topics',
        'persistent://t/n/topic-partition-2',
        'persistent://t/n/topic-partition-10'
      ])
    );
  });

  it('keeps missing timestamps last in both directions, preserves equal rows, and pins the aggregate', async () => {
    const p = (suffix: string) => `persistent://t/n/topic-partition-${suffix}`;
    withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position(p('10')),
          position(p('2'), { lastConsumed: 2000 }),
          position(p('3'), { lastConsumed: 2000 }),
          position(p('1'), { lastConsumed: 1000 })
        ])
      )
    );
    await renderTab('running');
    await waitFor(() => expect(renderedTopicOrder()).toEqual(['All topics', p('1'), p('2'), p('3'), p('10')]));

    fireEvent.click(header('lastConsumedPublished'));
    await waitFor(() => expect(renderedTopicOrder()).toEqual(['All topics', p('1'), p('2'), p('3'), p('10')]));

    fireEvent.click(header('lastConsumedPublished'));
    await waitFor(() => expect(renderedTopicOrder()).toEqual(['All topics', p('2'), p('3'), p('1'), p('10')]));
  });

  it('treats an incomplete retained-entry pair as missing in both sort directions', async () => {
    const p = (suffix: string) => `persistent://t/n/topic-partition-${suffix}`;
    withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position(p('1'), { ordinal: 9 }),
          position(p('2'), { ordinal: 2, retained: 10 }),
          position(p('3'), { ordinal: 1, retained: 10 })
        ])
      )
    );
    await renderTab('running');
    await waitFor(() => expect(renderedTopicOrder()).toHaveLength(4));

    fireEvent.click(header('entriesRead'));
    await waitFor(() => expect(renderedTopicOrder()).toEqual(['All topics', p('3'), p('2'), p('1')]));

    fireEvent.click(header('entriesRead'));
    await waitFor(() => expect(renderedTopicOrder()).toEqual(['All topics', p('2'), p('3'), p('1')]));
  });

  it('copies exact raw values while displaying readable values, and never makes a dash copyable', async () => {
    const topicFqn = 'persistent://t/n/copy-me';
    withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position(topicFqn, {
            firstConsumed: 1000,
            lastConsumed: 2000,
            firstConsumedId: [1, 10],
            lastConsumedId: [2, 11],
            ordinal: 4,
            retained: 10,
            entryFraction: 0.4
          })
        ])
      )
    );
    await renderTab('running');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy Earliest processed message ID' })).toBeTruthy());

    const idCell = screen.getByRole('button', { name: 'Copy Earliest processed message ID' });
    expect(idCell.textContent).toBe('01 0a');
    expect(idCell.getAttribute('title')).toBe('010a');
    fireEvent.click(idCell);

    const timeCell = screen.getByRole('button', { name: 'Copy Earliest processed publish time' });
    expect(timeCell.textContent).toBe(new Date(1000).toLocaleString());
    expect(timeCell.getAttribute('title')).toBe(new Date(1000).toISOString());
    fireEvent.click(timeCell);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Stored entry position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Stored entry position (%)' }));

    await waitFor(() =>
      expect(mockClipboardWriteText.mock.calls.map(([value]) => value)).toEqual([
        '010a',
        new Date(1000).toISOString(),
        '4 / 10',
        '0.4'
      ])
    );
    expect(mockNotifications.current.notifySuccess).toHaveBeenCalledTimes(4);
    expect(screen.queryByRole('button', { name: 'Copy Earliest stored message ID' })).toBeNull();
  });

  it('reports a clipboard failure instead of claiming the value was copied', async () => {
    withClient(jest.fn().mockResolvedValue(answer(Code.OK, '', [position('persistent://t/n/copy-failure')])));
    await renderTab('running');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy Topic / partition' })).toBeTruthy());

    mockClipboardWriteText.mockRejectedValueOnce(new Error('permission denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Topic / partition' }));

    await waitFor(() => expect(mockNotifications.current.notifyWarn).toHaveBeenCalledTimes(1));
    expect(mockNotifications.current.notifySuccess).not.toHaveBeenCalled();
  });
});
