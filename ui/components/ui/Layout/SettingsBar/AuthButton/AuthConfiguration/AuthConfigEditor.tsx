import React from 'react';
import s from './AuthConfigEditor.module.css'
import OAuth2 from './methods/OAuth2';
import Jwt from './methods/Jwt/Jwt';
import Select from '../../../../Select/Select';
import { AuthConfig, AuthType } from '../types';
import Button from '../../../../Button/Button';
import * as AppContext from '../../../../../app/contexts/AppContext';
import * as Notifications from '../../../../../app/contexts/Notifications';

export type AuthConfigEditorProps = {
  onDone: () => void;
};

const AuthConfigEditor: React.FC<AuthConfigEditorProps> = (props) => {
  const [authConfig, setAuthConfig] = React.useState<AuthConfig>({ type: 'none' });
  const { config } = AppContext.useContext();
  const { notifyInfo } = Notifications.useContext();

  return (
    <div className={s.AuthConfigEditor}>
      <Select<AuthType>
        list={[
          { type: 'item', title: 'None', value: 'none' },
          { type: 'item', title: 'OAuth2', value: 'oauth2' },
          { type: 'item', title: 'JWT', value: 'jwt' }
        ]}
        value={authConfig.type}
        onChange={(type) => {
          switch (type) {
            case 'none':
              setAuthConfig({ type: 'none' });
              break;
            case 'oauth2':
              setAuthConfig({ type: 'oauth2', issuerUrl: '', privateKey: '', audience: '', scope: '' });
              break;
            case 'jwt':
              setAuthConfig({ type: 'jwt', token: '' });
              break;
          }
        }}
      />

      <div className={s.Editor}>
        {authConfig.type === 'oauth2' && <OAuth2 value={authConfig} onChange={setAuthConfig} />}
        {authConfig.type === 'jwt' && <Jwt value={authConfig} onChange={setAuthConfig} />}
      </div>

      <div className={s.Footer}>
        <Button type='regular' text='Cancel' onClick={props.onDone} />
        <Button
          type='primary'
          text='Save'
          onClick={async () => {
            const res = await fetch(`${config.publicUrl}/set-pulsar-auth`, {
              method: 'POST',
              body: JSON.stringify(authConfig),
            });

            if (res.status === 400) {
              notifyInfo('Invalid auth info provided.');
              return;
            } else if (res.status !== 200) {
              notifyInfo('Server error happened. Check network connection or contact your administrator.');
              return;
            }

            window.location.href = config.publicUrl;
          }}
        />
      </div>
    </div>
  );
}

export default AuthConfigEditor;
