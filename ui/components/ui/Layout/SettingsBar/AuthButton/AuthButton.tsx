import React from 'react';
import s from './AuthButton.module.css'
import SmallButton from '../../../SmallButton/SmallButton';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import AuthConfigEditor from './AuthConfiguration/AuthConfigEditor';
import Button from '../../../Button/Button';
import {AuthConfig, AuthType} from './types';

export type AuthButtonProps = {};

const AuthButton: React.FC<AuthButtonProps> = (props) => {
  const modals = Modals.useContext();
  const [authConfig, setAuthConfig] = React.useState<AuthConfig>({ type: 'none' });

  return (
    <div className={s.AuthButton}>
      <SmallButton
        type='regular'
        onClick={() => modals.push({
          id: 'auth-modal',
          title: 'Configure auth',
          content: (
            <div>
              <AuthConfigEditor
                value={authConfig}
                onChange={setAuthConfig}
              />

              <div className={s.ModalFooter}>
                <Button type='regular' text='Cancel' onClick={() => { }} />
                <Button type='primary' text='Save' onClick={() => { }} />
              </div>
            </div>
          ),
        })}
        text='Configure auth'
      />
    </div>
  );
}

export default AuthButton;
