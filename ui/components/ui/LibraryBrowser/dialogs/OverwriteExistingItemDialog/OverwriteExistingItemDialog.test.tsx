/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The overwrite flow shares SaveItemDialog's failure mode: `libraryItemToPb` runs synchronously in
 * `saveItem`, outside any catch, so an item carrying an unparseable message-id hex string used to
 * escape the async click handler as an unhandled rejection - Overwrite clicked, nothing sent,
 * nothing said. The guard must turn that into a notification and send nothing.
 *
 * The transport and the notifier are replaced; the dialog, its SearchResults (which lists nothing
 * here - no search contexts) and the selected-item fetch are real. The item editor is not the
 * wiring under test.
 */
const mockClients = { current: undefined as unknown };
jest.mock('../../../../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current,
}));

const mockNotifications = { current: undefined as unknown };
jest.mock('../../../../app/contexts/Notifications', () => ({
  useContext: () => mockNotifications.current,
}));

jest.mock('../../LibraryItemEditor/LibraryItemEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-library-item-editor" />,
}));

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import OverwriteExistingItemDialog from './OverwriteExistingItemDialog';
import { libraryItemToPb } from '../../model/library-conversions';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { Status } from '../../../../../grpc-web/google/rpc/status_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';

const okStatus = () => {
  const s = new Status();
  s.setCode(Code.OK);
  s.setMessage('');
  return s;
};

/** A start-from item whose message id carries `hexString`. */
const startFromLibraryItem = (id: string, name: string, hexString: string) => ({
  metadata: { updatedAt: '', availableForContexts: [] },
  spec: {
    metadata: { id, name, descriptionMarkdown: '', type: 'consumer-session-start-from' },
    spec: {
      startFrom: {
        type: 'messageId',
        messageId: {
          type: 'value',
          val: {
            metadata: { id: `${id}-mid`, name: '', descriptionMarkdown: '', type: 'message-id' },
            spec: { hexString },
          },
        },
      },
    },
  },
});

const makeHarness = () => {
  const saveRequests: any[] = [];
  const notifyError = jest.fn();
  const notifySuccess = jest.fn();

  // The item already in the library - what the dialog fetches and offers to overwrite. It has to
  // be valid: it round-trips through fromPb on arrival.
  const existingItem = startFromLibraryItem('existing-1', 'existing', '08 c3');

  mockClients.current = {
    libraryServiceClient: {
      getLibraryItem: () => {
        const res = new pb.GetLibraryItemResponse();
        res.setStatus(okStatus());
        res.setItem(libraryItemToPb(existingItem as never));
        return Promise.resolve(res);
      },
      saveLibraryItem: (req: unknown) => {
        saveRequests.push(req);
        const res = new pb.SaveLibraryItemResponse();
        res.setStatus(okStatus());
        return Promise.resolve(res);
      },
      listLibraryItems: () => Promise.reject(new Error('no search contexts in these tests')),
    },
  };

  mockNotifications.current = {
    notifySuccess,
    notifyInfo: jest.fn(),
    notifyWarn: jest.fn(),
    notifyError,
  };

  return { saveRequests, notifyError, notifySuccess };
};

const overwriteButton = () => screen.getByTestId('lib-overwrite-confirm') as HTMLButtonElement;

const renderDialog = async (libraryItem: unknown, onSaved = jest.fn()) => {
  await act(async () => {
    render(
      <MemoryRouter>
        <Modals.DefaultProvider>
          <OverwriteExistingItemDialog
            libraryItem={libraryItem as never}
            libraryContext={{} as never}
            onCanceled={jest.fn()}
            onSaved={onSaved}
            itemIdToOverwrite="existing-1"
          />
        </Modals.DefaultProvider>
      </MemoryRouter>
    );
  });

  // Overwrite stays disabled until the selected item's fetch lands.
  await waitFor(() => expect(overwriteButton().disabled).toBe(false));
  return { onSaved };
};

const clickOverwrite = async () => {
  await act(async () => {
    fireEvent.click(overwriteButton());
  });
};

describe('overwriting with an item the pb conversion refuses', () => {
  it('surfaces the parse error instead of wedging silently', async () => {
    const harness = makeHarness();
    const { onSaved } = await renderDialog(startFromLibraryItem('draft-1', 'a draft', 'zz'));

    await clickOverwrite();

    expect(harness.notifyError).toHaveBeenCalledTimes(1);
    expect(String(harness.notifyError.mock.calls[0][0])).toContain('Invalid hex string');
    expect(harness.saveRequests).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('still overwrites with an item whose hex actually parses', async () => {
    const harness = makeHarness();
    const { onSaved } = await renderDialog(startFromLibraryItem('draft-1', 'a draft', '08 c3 03'));

    await clickOverwrite();

    expect(harness.saveRequests).toHaveLength(1);
    expect(harness.notifyError).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
