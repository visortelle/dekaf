import React, { ReactNode } from 'react';

import Button from '../ui/Button/Button';
import { H3 } from '../ui/H/H';
import Input from '../ui/Input/Input';
import { DefaultProvider } from '../app/contexts/Modals/Modals';

import s from './ConfirmationDialog.module.css';
import ActionButton from '../ui/ActionButton/ActionButton';
import Checkbox from '../ui/Checkbox/Checkbox';

type Props = {
  description: ReactNode,
  onConfirm: () => void,
  onCancel: () => void,
  switchForceDelete?: () => void,
  forceDelete?: boolean,
  guard?: string,
}

const ConfirmationDialog = (props: Props) => {

  const { switchForceDelete, forceDelete } = props

  return (
    <DefaultProvider>
      <div className={s.ConfirmationDialog}>

        {props.description}

        {switchForceDelete &&
          <div className={s.ActionCheckbox}>
            <Checkbox isInline id="forceDelete" checked={forceDelete} onChange={() => switchForceDelete()} />
            &nbsp;
            <label htmlFor="forceDelete">Delete forcefully by deleting all inside.</label>
          </div>
        }

        <div className={s.ActionButtons}>
          <Button
            type="primary"
            text={`Confirm`}
            onClick={props.onConfirm}
          />
          <Button
            type="danger"
            text={`Cansel`}
            onClick={props.onCancel}
          />
        </div>
        
      </div>
    </DefaultProvider>
  )
}

export default ConfirmationDialog;