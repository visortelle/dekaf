import React, { useState } from 'react';
import s from './Editor.module.css'
import * as GrpcClient from '../../contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import { GetMaskedCredentialsRequest, GetCurrentCredentialsRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/pulsar_auth_pb';
import { MaskedCredentials } from '../domain';
import CredentialsEditor from './CredentialsEditor/CredentialsEditor';
import Button from '../../../ui/Button/Button';
import useSWR, { mutate } from "swr";
import { swrKeys } from '../../../swrKeys';
import { maskedCredentialsFromPb } from '../conversions';
import * as st from '../../../ui/SimpleTable/SimpleTable.module.css';
import SmallButton from '../../../ui/SmallButton/SmallButton';
import deleteIcon from './delete.svg';
import * as AppContext from '../../../app/contexts/AppContext';
import refreshIcon from '../../../ui/Table/refresh.svg';

export type EditorProps = {
  onDone: () => void;
};

type EditorView = "list" | "new";
type DefaultCredentialsName = "Default" | "DefaultOAuth2" | "DefaultJwt";

function isDefaultCredentialsName(value: string): value is DefaultCredentialsName {
  return value === "Default" || value === "DefaultOAuth2" || value === "DefaultJwt";
}


const Editor: React.FC<EditorProps> = (props) => {
  const { config } = AppContext.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
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

  const { data: currentCredentials, error: currentCredentialsError } = useSWR(
    swrKeys.pulsar.auth.credentials.current._(),
    async () => {
      const req = new GetCurrentCredentialsRequest();
      const res = await pulsarAuthServiceClient.getCurrentCredentials(req, {})
        .catch((err) => notifyError(`Unable to get the current credentials name. ${err.message}`));

      if (res === undefined) {
        return undefined;
      }

      return res.getName()?.getValue();
    }
  );

  if (currentCredentialsError) {
    notifyError(`Unable to get the current credentials name. ${currentCredentialsError}`);
  }

  const onCredentialsUpdate = async () => {
    const res = await fetch(`${config.publicUrl}/pulsar-auth/update/default`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(async res => {
        if (res.status === 400) {
          let errorBody = await res.text();
          notifyError(errorBody);
          return;
        } else if (res.status !== 200) {
          notifyError('Server error happened.');
          return;
        }

        await mutate(swrKeys.pulsar.auth.credentials._());
        await mutate(swrKeys.pulsar.auth.credentials.current._());

        notifySuccess('Default credentials updated successfully.');
      })
      .catch(err => {
        notifyError(`Unable to update credentials: ${err}`)
        return;
      });
  }

  return (
    <div className={s.Editor}>
      {view === 'list' && (
        <div className={s.List}>
          {!maskedCredentials?.length ? null : (
            <table className={st.Table}>
              <thead>
                <tr className={st.Row}>
                  <th className={st.Cell}></th>
                  <th className={st.Cell}>Name</th>
                  <th className={st.Cell}>Type</th>
                  <th className={st.Cell}></th>
                </tr>
              </thead>
              <tbody>
                {(maskedCredentials || []).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })).map((item) => (
                  <tr key={item.name} className={st.Row}>
                    <td className={st.Cell}>
                      {currentCredentials === item.name && (
                        <strong style={{ color: `var(--accent-color-blue)` }}>Current</strong>
                      )}
                    </td>
                    <td className={st.Cell}>{item.name}</td>
                    <td className={st.Cell}>{credentialsTypeToLabel(item.type)}</td>
                    <td className={st.Cell}>
                      <div className={s.CredentialsActions}>
                        <SmallButton
                          type='regular'
                          onClick={async () => {
                            await fetch(`${config.publicUrl}/pulsar-auth/use/${encodeURIComponent(item.name)}`, {method: 'POST'})
                              .catch((err) => notifyError(`Unable to set current credentials: ${err}`));
                            await mutate(swrKeys.pulsar.auth.credentials._());
                            await mutate(swrKeys.pulsar.auth.credentials.current._());
                          }}
                          text='Set as current'
                        />
                        <SmallButton
                          type='danger'
                          onClick={async () => {
                            await fetch(`${config.publicUrl}/pulsar-auth/delete/${encodeURIComponent(item.name)}`, {method: 'POST'})
                              .catch((err) => notifyError(`Unable to delete credentials: ${err}`));
                            await mutate(swrKeys.pulsar.auth.credentials._());
                            await mutate(swrKeys.pulsar.auth.credentials.current._());
                          }}
                          title='Delete'
                          svgIcon={deleteIcon}
                          style={{visibility: isDefaultCredentialsName(item.name) ? "hidden" : "visible"}}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(maskedCredentials || []).length === 0 && (
            <div className={s.NoData}>No credentials found.</div>
          )}

          <div className={s.ListFooter}>
            <div className={s.ListFooterLeft}>
              <SmallButton
                type='regular'
                title='Refresh default credentials'
                onClick={() => onCredentialsUpdate()}
                svgIcon={refreshIcon}
              />
            </div>
            <div className={s.ListFooterRight}>
              <Button type='primary' onClick={() => setView('new')} text='Add' />
              <Button type='regular' onClick={props.onDone} text='Done' />
            </div>
          </div>
        </div>
      )
      }

      {
        view === 'new' && (
          <CredentialsEditor
            onDone={async () => {
              setView('list');
              await mutate(swrKeys.pulsar.auth.credentials._());
            }}
          />
        )
      }
    </div >
  );
}

function credentialsTypeToLabel(type: MaskedCredentials['type']): string {
  switch (type) {
    case 'empty':
      return 'Empty';
    case 'oauth2':
      return 'OAuth2';
    case 'jwt':
      return 'JWT';
    default:
      return 'Unknown';
  }
}

export default Editor;
