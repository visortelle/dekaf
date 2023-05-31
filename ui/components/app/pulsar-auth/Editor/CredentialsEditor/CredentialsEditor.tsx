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

export type CredentialsEditorProps = {
  onDone: () => void;
};

const CredentialsEditor: React.FC<CredentialsEditorProps> = (props) => {
  const [credentialsName, setCredentialsName] = React.useState<string>('');
  const [credentials, setCredentials] = React.useState<Credentials>({ type: 'none' });
  const { config } = AppContext.useContext();
  const { notifyInfo } = Notifications.useContext();
  const [errors, setErrors] = React.useState<string[]>([]);

  return (
    <div className={s.CredentialsEditor}>
      <FormItem>
        <FormLabel content='Name' isRequired />
        <Input value={credentialsName} onChange={setCredentialsName} />
      </FormItem>

      <FormItem>
        <FormLabel content='Type' isRequired />
        <Select<CredentialsType>
          list={[
            { type: 'item', title: 'None', value: 'none' },
            { type: 'item', title: 'OAuth2', value: 'oauth2' },
            { type: 'item', title: 'JWT', value: 'jwt' }
          ]}
          value={credentials.type}
          onChange={(type) => {
            switch (type) {
              case 'none':
                setCredentials({ type: 'none' });
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

      {errors.length > 0 && (
        <div className={s.Errors}>
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}

      <div className={s.Footer}>
        <Button type='regular' text='Cancel' onClick={props.onDone} />
        <Button
          type='primary'
          text='Save'
          onClick={async () => {
            const res = await fetch(`${config.publicUrl}/pulsar-auth/add/${credentialsName}`, {
              method: 'POST',
              body: JSON.stringify(credentials),
            });

            if (res.status === 400) {
              notifyInfo('Invalid pulsar auth info provided.');
              return;
            } else if (res.status !== 200) {
              notifyInfo('Server error happened.');
              return;
            }
          }}
        />
      </div>
    </div>
  );
}

export default CredentialsEditor;
