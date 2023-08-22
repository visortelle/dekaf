import React from 'react';
import s from './CredentialsEditor.module.css'
import OAuth2 from '../methods/OAuth2/OAuth2';
import Jwt from '../methods/Jwt/Jwt';
import Select from '../../../../ui/Select/Select';
import { Credentials, CredentialsType } from '../../domain';
import Button from '../../../../ui/Button/Button';
import * as AppContext from '../../../contexts/AppContext';
import * as Notifications from '../../../contexts/Notifications';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Input from '../../../../ui/Input/Input';
import { swrKeys } from '../../../../swrKeys';
import { mutate } from 'swr';

export type CredentialsEditorProps = {
  onDone: () => void;
};

const CredentialsEditor: React.FC<CredentialsEditorProps> = (props) => {
  const [credentialsName, setCredentialsName] = React.useState<string>('');
  const [credentials, setCredentials] = React.useState<Credentials>({ type: 'empty' });
  const { config } = AppContext.useContext();
  const { notifyError } = Notifications.useContext();

  return (
    <div className={s.CredentialsEditor}>
      <FormItem>
        <FormLabel content='Name' isRequired />
        <Input value={credentialsName} annotation="Only alphanumerics, underscores(_) and dashes(-) are allowed." onChange={setCredentialsName} />
      </FormItem>

      <FormItem>
        <FormLabel content='Type' isRequired />
        <Select<CredentialsType>
          list={[
            { type: 'item', title: 'Empty', value: 'empty' },
            { type: 'item', title: 'OAuth2', value: 'oauth2' },
            { type: 'item', title: 'JWT', value: 'jwt' }
          ]}
          value={credentials.type}
          onChange={(type) => {
            switch (type) {
              case 'empty':
                setCredentials({ type: 'empty' });
                break;
              case 'oauth2':
                setCredentials({ type: 'oauth2', issuerUrl: '', privateKey: '', audience: '', scope: '' });
                break;
              case 'jwt':
                setCredentials({ type: 'jwt', token: '' });
                break;
            }
          }}
        />
      </FormItem>

      <div>
        {credentials.type === 'oauth2' && (
          <OAuth2
            value={credentials}
            onChange={setCredentials}
          />
        )}
        {credentials.type === 'jwt' && (
          <Jwt
            value={credentials}
            onChange={setCredentials}
          />
        )}
      </div>

      <div className={s.Footer}>
        <Button type='regular' text='Cancel' onClick={props.onDone} />
        <Button
          type='primary'
          disabled={credentialsName.length === 0}
          text='Save'
          onClick={ async () => {
            const res = await fetch(`${config.publicUrl}/pulsar-auth/add/${encodeURIComponent(credentialsName)}`, {
              method: 'POST',
              body: JSON.stringify(credentials),
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
                  const json = await res.json();
                  notifyError(`Server error happened. ${json}`);
                  return;
                }

                await mutate(swrKeys.pulsar.auth.credentials._());
                await mutate(swrKeys.pulsar.auth.credentials.current._());


                props.onDone();
              })
              .catch(err => {
                notifyError(`Unable to save credentials: ${err}`)
                return;
              });
          }}
        />
      </div>
    </div>
  );
}

export default CredentialsEditor;
