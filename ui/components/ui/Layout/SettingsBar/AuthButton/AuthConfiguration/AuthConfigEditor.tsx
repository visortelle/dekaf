import React from 'react';
import s from './AuthConfigEditor.module.css'
import OAuth2 from './methods/OAuth2';
import Jwt from './methods/Jwt/Jwt';
import Select from '../../../../Select/Select';
import Button from '../../../../Button/Button';
import { AuthConfig, AuthType } from '../types';

export type AuthConfigEditorProps = {
  value: AuthConfig,
  onChange: (config: AuthConfig) => void,
};

const AuthConfigEditor: React.FC<AuthConfigEditorProps> = (props) => {
  const [authType, setAuthType] = React.useState<AuthType>('none');

  return (
    <div className={s.AuthConfigEditor}>
      <Select<AuthType>
        list={[
          { type: 'item', title: 'None', value: 'none' },
          { type: 'item', title: 'OAuth2', value: 'oauth2' },
          { type: 'item', title: 'JWT', value: 'jwt' }
        ]}
        value={authType}
        onChange={setAuthType}
      />

      <div className={s.Editor}>
        {authType === 'oauth2' && <OAuth2 />}
        {authType === 'jwt' && <Jwt />}
      </div>
    </div>
  );
}

export default AuthConfigEditor;
