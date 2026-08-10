/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * Column reorder DRIVEN THROUGH THE HEADERS of the shared table: which order a drop produces, and
 * that the result is what gets persisted. The pure rules live in `useColumnOrder.spec.ts`; this is
 * the half that decides what the DOM asks for - and a drop target the DOM can never emit makes a
 * position unreachable no matter how correct the pure helper is.
 */
const mockNotifications = {
  notifySuccess: jest.fn(),
  notifyInfo: jest.fn(),
  notifyWarn: jest.fn(),
  notifyError: jest.fn(),
};
jest.mock('../../app/contexts/Notifications', () => ({
  useContext: () => mockNotifications,
}));

// The production table virtualizes rows and measures its viewport; jsdom lays nothing out, so the
// same header/rows are rendered into a plain table here (the pattern TopicPositions.test.tsx uses).
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
          props.data.map((entry: any, index: number) =>
            ReactRuntime.createElement('tr', { key: index }, props.itemContent(index, entry)))
        )
      ),
  };
});

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import Table from './Table';

type ColumnKey = 'a' | 'b' | 'c';
type Entry = { id: string };

const columns = {
  columns: {
    a: { title: 'A', render: () => 'a' },
    b: { title: 'B', render: () => 'b' },
    c: { title: 'C', render: () => 'c' },
  },
  defaultConfig: [
    { columnKey: 'a' as const, visibility: 'visible' as const, width: 100 },
    { columnKey: 'b' as const, visibility: 'visible' as const, width: 100 },
    { columnKey: 'c' as const, visibility: 'visible' as const, width: 100 },
  ],
};

const renderTable = async (tableId: string) => {
  await act(async () => {
    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, provider: () => new Map() }}>
        <Table<ColumnKey, Entry, never>
          tableId={tableId}
          dataLoader={{ cacheKey: [tableId], loader: async () => [{ id: '1' }] }}
          columns={columns}
          getId={(entry) => entry.id}
          autoRefresh={{ intervalMs: 0 }}
          toolbar={{ visibility: 'hidden' }}
        />
      </SWRConfig>
    );
  });
};

const headerOrder = () =>
  screen.getAllByTestId('table-th').map((th) => th.getAttribute('data-column-key'));

const th = (columnKey: ColumnKey) =>
  screen.getAllByTestId('table-th').find((el) => el.getAttribute('data-column-key') === columnKey)!;

/** One native drag gesture: pick a header up, hover another, drop it there. */
const dragOnto = (dragged: ColumnKey, target: ColumnKey) => {
  const dataTransfer = { setData: jest.fn(), getData: () => dragged, dropEffect: '', effectAllowed: '' };
  fireEvent.dragStart(th(dragged), { dataTransfer });
  fireEvent.dragOver(th(target), { dataTransfer });
  fireEvent.drop(th(target), { dataTransfer });
  fireEvent.dragEnd(th(dragged), { dataTransfer });
};

describe('dragging a column header of the shared table', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('moves the dragged column onto a LATER position, including the last one', async () => {
    await renderTable('drag-to-end');
    expect(headerOrder()).toEqual(['a', 'b', 'c']);

    // The whole header is one drop target and it highlights as one, so dropping A on C means "put
    // A where C is" - A ends up last. Reading every drop as "insert BEFORE the target" instead
    // makes the final position unreachable by any gesture: A on C would yield b,a,c, and no
    // header exists to the right of C to drop on.
    dragOnto('a', 'c');

    expect(headerOrder()).toEqual(['b', 'c', 'a']);
    // ...and the order that is on screen is the order that survives a reload.
    expect(JSON.parse(window.localStorage.getItem('table:drag-to-end:column-order')!)).toEqual(['b', 'c', 'a']);
  });

  it('moves it onto an EARLIER position, including the first one', async () => {
    await renderTable('drag-to-start');

    dragOnto('c', 'a');

    expect(headerOrder()).toEqual(['c', 'a', 'b']);
    expect(JSON.parse(window.localStorage.getItem('table:drag-to-start:column-order')!)).toEqual(['c', 'a', 'b']);
  });

  it('dropping a column on itself changes nothing', async () => {
    await renderTable('drag-self');

    dragOnto('b', 'b');

    expect(headerOrder()).toEqual(['a', 'b', 'c']);
  });
});
