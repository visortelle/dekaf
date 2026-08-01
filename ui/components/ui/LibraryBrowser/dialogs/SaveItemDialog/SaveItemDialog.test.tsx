/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * Saving an item the pb conversion cannot serialise - e.g. a message-id hex string the start-from
 * editor flags inline but still commits - used to throw SYNCHRONOUSLY out of `saveItem`, outside
 * any catch. Out of an async click handler that is only an unhandled rejection: no notification,
 * no request, and a Save button that appears to do nothing at all. The dialog must surface the
 * parse error instead, and stay usable for the next attempt.
 *
 * The gRPC transport and the notifier are replaced; the dialog itself is real. The item editor and
 * the matchers input are not the wiring under test - the save path reads the item from state, never
 * back through either input.
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
jest.mock('../../SearchEditor/ResourceMatchersInput/ResourceMatchersInput', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-resource-matchers-input" />,
}));

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import SaveItemDialog from './SaveItemDialog';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { Status } from '../../../../../grpc-web/google/rpc/status_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';

const okStatus = () => {
  const s = new Status();
  s.setCode(Code.OK);
  s.setMessage('');
  return s;
};

const makeHarness = () => {
  const saveRequests: any[] = [];
  const notifyError = jest.fn();
  const notifySuccess = jest.fn();

  mockClients.current = {
    libraryServiceClient: {
      saveLibraryItem: (req: unknown) => {
        saveRequests.push(req);
        const res = new pb.SaveLibraryItemResponse();
        res.setStatus(okStatus());
        return Promise.resolve(res);
      },
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

/** A start-from item whose message id carries `hexString` - the editor commits it as typed. */
const startFromLibraryItem = (hexString: string) => ({
  metadata: { updatedAt: '', availableForContexts: [] },
  spec: {
    metadata: {
      id: 'start-from-1',
      name: 'a start from',
      descriptionMarkdown: '',
      type: 'consumer-session-start-from',
    },
    spec: {
      startFrom: {
        type: 'messageId',
        messageId: {
          type: 'value',
          val: {
            metadata: { id: 'mid-1', name: '', descriptionMarkdown: '', type: 'message-id' },
            spec: { hexString },
          },
        },
      },
    },
  },
});

/** The same hex string saved as a standalone message-id item - the other conversion entry point. */
const messageIdLibraryItem = (hexString: string) => ({
  metadata: { updatedAt: '', availableForContexts: [] },
  spec: {
    metadata: { id: 'mid-item-1', name: 'a message id', descriptionMarkdown: '', type: 'message-id' },
    spec: { hexString },
  },
});

const renderDialog = (libraryItem: unknown, onSaved = jest.fn()) => {
  render(
    <MemoryRouter>
      <Modals.DefaultProvider>
        <SaveItemDialog
          libraryItem={libraryItem as never}
          isExistingItem={false}
          libraryContext={{} as never}
          onCanceled={jest.fn()}
          onSaved={onSaved}
        />
      </Modals.DefaultProvider>
    </MemoryRouter>
  );
  return { onSaved };
};

const clickSave = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('lib-save-dialog-save'));
  });
};

describe('saving an item the pb conversion refuses', () => {
  it.each([
    ['a start-from wrapping a message id', startFromLibraryItem('zz')],
    ['a standalone message-id item', messageIdLibraryItem('zz')],
  ])('surfaces the parse error for %s instead of wedging silently', async (_name, libraryItem) => {
    const harness = makeHarness();
    const { onSaved } = renderDialog(libraryItem);

    await clickSave();

    expect(harness.notifyError).toHaveBeenCalledTimes(1);
    expect(String(harness.notifyError.mock.calls[0][0])).toContain('Invalid hex string');
    // Nothing left the dialog: no request was built, so none was sent, and nothing was "saved".
    expect(harness.saveRequests).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it.each([
    ['a BLANK start-from message id', startFromLibraryItem('')],
    ['a BLANK standalone message-id item', messageIdLibraryItem('   ')],
  ])('refuses to persist %s - a value that cannot start a session must not be storable', async (_name, libraryItem) => {
    // The shared parser maps blank text to a ZERO-LENGTH byte array, so a freshly selected
    // Message-ID mode used to save fine and then fail every later Play of the item.
    const harness = makeHarness();
    const { onSaved } = renderDialog(libraryItem);

    await clickSave();

    expect(harness.notifyError).toHaveBeenCalledTimes(1);
    expect(String(harness.notifyError.mock.calls[0][0])).toContain('Enter the message id');
    expect(harness.saveRequests).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('leaves the dialog usable after the refusal - the next click still answers', async () => {
    // The wedge was the symptom: pre-guard, the first click died as an unhandled rejection and so
    // did every following one. Two clicks, two notifications, is the observable difference.
    const harness = makeHarness();
    renderDialog(startFromLibraryItem('zz'));

    await clickSave();
    await clickSave();

    expect(harness.notifyError).toHaveBeenCalledTimes(2);
    expect(harness.saveRequests).toHaveLength(0);
  });

  it('still saves an item whose hex actually parses', async () => {
    // The counterpart: "never throw out of Save" is trivially satisfiable by never saving.
    const harness = makeHarness();
    const { onSaved } = renderDialog(startFromLibraryItem('08 c3 03 10 cd 04 20 00 30 01'));

    await clickSave();

    expect(harness.saveRequests).toHaveLength(1);
    expect(harness.notifyError).not.toHaveBeenCalled();
    expect(harness.notifySuccess).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
