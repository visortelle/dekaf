import React, { ReactNode, useState } from 'react';

import Button from '../ui/Button/Button';
import { DefaultProvider } from '../app/contexts/Modals/Modals';

import s from './ConfirmationDialog.module.css';
import Checkbox from '../ui/Checkbox/Checkbox';
import Input from '../ui/Input/Input';

type Props = {
  description: ReactNode,
  onConfirm: () => void,
  onCancel: () => void,
  switchForceDelete?: () => void,
  forceDelete?: boolean,
  guard?: string,
}

const ConfirmationDialog = (props: Props) => {

  const { switchForceDelete, forceDelete } = props;

  const [guard, setGuard] = useState('');

  return (
    <DefaultProvider>
      <div className={s.ConfirmationDialog}>

        {props.description}

        {props.guard &&
        <div className={`${s.Guard}`}>
          <span>
            Please type <strong>{props.guard}</strong> in the input to confirm.
          </span>
          <Input
            value={guard}
            onChange={(v) => setGuard(v)}
            placeholder={props.guard}
          />
        </div>
        }

        {switchForceDelete &&
          <div className={s.ActionCheckbox}>
            <Checkbox isInline id="forceDelete" checked={forceDelete} onChange={() => switchForceDelete()} />
            &nbsp;
            <label htmlFor="forceDelete">Delete forcefully by deleting all inside.</label>
          </div>
        }

        <div className={s.ActionButtons}>
          <Button
            type="regular"
            text={`Cansel`}
            onClick={() => props.onCancel()}
          />
          <Button
            type="primary"
            text={`Confirm`}
            onClick={() => props.onConfirm()}
            disabled={
              props.guard !== undefined &&
              props.guard !== guard
            }
          />
        </div>
        
      </div>
    </DefaultProvider>
  )
}

export default ConfirmationDialog;