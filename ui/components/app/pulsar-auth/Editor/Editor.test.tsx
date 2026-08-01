/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The credential list's "Set as current" and "Delete" actions POST to /pulsar-auth/use|delete. The
 * server now answers 404 for a name it does not know - e.g. a row the browser still shows after the
 * store changed under it. Those handlers only guarded a REJECTED fetch (`.catch`); a resolved but
 * non-OK response slipped through, so the click did nothing and said nothing. A non-OK status must
 * surface, the way the Add flow (CredentialsEditor) already does.
 */
const mockClients = { current: undefined as unknown };
jest.mock('../../contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current,
}));

const mockNotifications = { current: undefined as unknown };
jest.mock('../../../app/contexts/Notifications', () => ({
  useContext: () => mockNotifications.current,
}));

const mockAppContext = { current: undefined as unknown };
jest.mock('../../../app/contexts/AppContext', () => ({
  useContext: () => mockAppContext.current,
}));

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import Editor from './Editor';
import {
  GetMaskedCredentialsResponse,
  GetCurrentCredentialsResponse,
  MaskedCredentials,
  CredentialsType,
} from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/pulsar_auth_pb';
import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb';

const listResponse = () => {
  const res = new GetMaskedCredentialsResponse();
  const cred = new MaskedCredentials();
  cred.setName('cred-a');
  cred.setType(CredentialsType.CREDENTIALS_TYPE_JWT);
  res.setCredentialsList([cred]);
  return res;
};

const currentResponse = () => {
  const res = new GetCurrentCredentialsResponse();
  res.setName(new StringValue().setValue('Default'));
  return res;
};

const notFound = () =>
  Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('unknown credentials name') } as unknown as Response);
const okResponse = () =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') } as unknown as Response);

const makeHarness = (fetchImpl: () => Promise<Response>) => {
  const notifyError = jest.fn();
  mockClients.current = {
    pulsarAuthServiceClient: {
      getMaskedCredentials: () => Promise.resolve(listResponse()),
      getCurrentCredentials: () => Promise.resolve(currentResponse()),
    },
  };
  mockNotifications.current = { notifyError, notifySuccess: jest.fn(), notifyInfo: jest.fn(), notifyWarn: jest.fn() };
  mockAppContext.current = { config: { publicBaseUrl: '' } };
  (global as any).fetch = jest.fn(fetchImpl);
  return { notifyError };
};

const renderEditor = async () => {
  await act(async () => {
    render(
      // A fresh cache per render, so the global `mutate` in the handlers never bleeds between tests.
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false, dedupingInterval: 0, revalidateOnFocus: false }}>
        <Editor onDone={jest.fn()} />
      </SWRConfig>
    );
  });
};

describe('a resolved non-OK response to a use/delete action is surfaced', () => {
  it('surfaces a 404 from "Set as current"', async () => {
    const { notifyError } = makeHarness(notFound);
    await renderEditor();

    const button = await screen.findByTestId('credentials-set-current');
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(String(notifyError.mock.calls[0][0])).toContain('404');
  });

  it('surfaces a 404 from "Delete"', async () => {
    const { notifyError } = makeHarness(notFound);
    await renderEditor();

    const button = await screen.findByTestId('credentials-delete');
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(String(notifyError.mock.calls[0][0])).toContain('404');
  });

  it('says nothing when the action succeeds - the toast is for failures only', async () => {
    // The counterpart: "surface non-OK" is trivially satisfiable by shouting on every click.
    const { notifyError } = makeHarness(okResponse);
    await renderEditor();

    const button = await screen.findByTestId('credentials-set-current');
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(notifyError).not.toHaveBeenCalled();
  });
});
