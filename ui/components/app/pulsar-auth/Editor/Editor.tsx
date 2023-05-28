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

export type EditorProps = {
  onDone: () => void;
};

type EditorView = 'list' | 'new';

const Editor: React.FC<EditorProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { pulsarAuthServiceClient } = GrpcClient.useContext();
  const [maskedCredentialsList, setMaskedCredentialsList] = useState<MaskedCredentials[]>([]);
  const [view, setView] = useState<EditorView>('list');

  useEffect(() => {
    async function getCredentialsList() {
      const req = new GetMaskedCredentialsRequest();
      const res = await pulsarAuthServiceClient.getMaskedCredentials(req, {})
        .catch((err) => notifyError(`Unable to get the credentials list. ${err.message}`));

      if (res === undefined) {
        return;
      }
      console.log('res', res)
    }

    getCredentialsList();
  }, []);

  return (
    <div className={s.Editor}>
      {view === 'list' && (
        <div>
          <ListInput<MaskedCredentials>
            value={maskedCredentialsList}
            renderItem={(item) => (
              <div>{item.name}: {item.type}</div>
            )}
            validate={() => Either.right(undefined)}
            getId={(item) => item.name}
          />

          {maskedCredentialsList.length === 0 && (
            <div className={s.NoData}>No credentials found.</div>
          )}

          <div className={s.ListFooter}>
            <Button type='primary' onClick={() => setView('new')} text='Add new' />
          </div>
        </div>
      )}

      {view === 'new' && (
        <CredentialsEditor
          onDone={() => setView('list')}
        />
      )}
    </div>
  );
}

export default Editor;
