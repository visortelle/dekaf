import React from 'react';
import s from './AuthButton.module.css'
import SmallButton from '../../../SmallButton/SmallButton';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import AuthConfigEditor from './AuthConfiguration/AuthConfigEditor';

export type AuthButtonProps = {};

const AuthButton: React.FC<AuthButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.AuthButton}>
      <SmallButton
        type='regular'
        onClick={() => modals.push({
          id: 'auth-modal',
          title: 'Configure auth',
          content: (
            <AuthConfigEditor onDone={modals.pop}/>
          ),
        })}
        text='Configure auth'
      />
    </div>
  );
}

export default AuthButton;
