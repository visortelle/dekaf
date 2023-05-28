import React from 'react';
import s from './Button.module.css'
import SmallButton from '../../../ui/SmallButton/SmallButton';
import * as Modals from '../../contexts/Modals/Modals';
import Editor from '../Editor/Editor';

export type ButtonProps = {};

const Button: React.FC<ButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.AuthButton}>
      <SmallButton
        type='regular'
        onClick={() => modals.push({
          id: 'auth-modal',
          title: 'Pulsar credentials',
          content: <Editor onDone={modals.pop} />,
        })}
        text='Pulsar credentials'
      />
    </div>
  );
}

export default Button;
