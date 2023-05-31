import React, { useEffect, useState } from 'react';
import s from './Editor.module.css'
import * as GrpcClient from '../../contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import { GetMaskedCredentialsRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/pulsar_auth_pb';
import { MaskedCredentials } from '../domain';
import ListInput from '../../../ui/ConfigurationTable/ListInput/ListInput';
import * as Either from 'fp-ts/Either';
import CredentialsEditor from './CredentialsEditor/CredentialsEditor';
import Button from '../../../ui/Button/Button';
import useSWR, { mutate } from "swr";
import { swrKeys } from '../../../swrKeys';
import { maskedCredentialsFromPb } from '../conversions';

export type EditorProps = {
  onDone: () => void;
};

type EditorView = 'list' | 'new';

const Editor: React.FC<EditorProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { pulsarAuthServiceClient } = GrpcClient.useContext();
  const [view, setView] = useState<EditorView>('list');

  const { data: maskedCredentials, error: maskedCredentialsError } = useSWR(
    swrKeys.pulsar.auth.credentials._(),
    async () => {
      const req = new GetMaskedCredentialsRequest();
      const res = await pulsarAuthServiceClient.getMaskedCredentials(req, {})
        .catch((err) => notifyError(`Unable to get the credentials list. ${err.message}`));

      if (res === undefined) {
        return [];
      }

      return res.getCredentialsList().map(maskedCredentialsFromPb);
    }
  );

  if (maskedCredentialsError) {
    notifyError(`Unable to get the credentials list. ${maskedCredentialsError}`);
  }

  console.log('maskedCredentials', maskedCredentials)

  return (
    <div className={s.Editor}>
      {view === 'list' && (
        <div>
          <ListInput<MaskedCredentials>
            value={maskedCredentials || []}
            renderItem={(item) => (
              <div>{item.name}: {item.type}</div>
            )}
            validate={() => Either.right(undefined)}
            getId={(item) => item.name}
          />

          {(maskedCredentials || []).length === 0 && (
            <div className={s.NoData}>No credentials found.</div>
          )}

          <div className={s.ListFooter}>
            <Button type='primary' onClick={() => setView('new')} text='Add' />
          </div>
        </div>
      )}

      {view === 'new' && (
        <CredentialsEditor
          onDone={() => {
            setView('list');
            mutate(swrKeys.pulsar.auth.credentials._());
          }}
        />
      )}
    </div>
  );
}

export default Editor;
