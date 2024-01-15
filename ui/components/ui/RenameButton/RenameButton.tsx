import React, { useRef, useState } from 'react';
import s from './RenameButton.module.css'
import * as Modals from '../../app/contexts/Modals/Modals';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';
import Input from '../Input/Input';
import Button from '../Button/Button';
import renameIcon from './rename.svg';

type EditNameFormProps = {
  initialValue: string,
  onConfirm: (v: string) => void,
  onCancel: () => void,
};
const EditNameForm: React.FC<EditNameFormProps> = (props) => {
  const [value, setValue] = useState(props.initialValue);

  const confirm = () => {
    if (value.length === 0) {
      return;
    }

    props.onConfirm(value)
  };

  return (
    <div
      className={s.EditNameForm}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          confirm();
        }
      }}
    >
      <div className={s.EditNameFormContent}>
        <Input value={value} onChange={setValue} focusOnMount />
      </div>
      <div className={s.EditNameFormFooter}>
        <Button
          type='regular'
          text="Cancel"
          onClick={props.onCancel}
        />
        <Button
          type='primary'
          text="Confirm"
          onClick={confirm}
          disabled={value.length === 0}
        />
      </div>
    </div>
  );
}

export type RenameButtonProps = {
  modal: {
    id: string,
    title: string
  },
  button?: Partial<SmallButtonProps>,
  initialValue: string,
  onConfirm: (v: string) => void,
};

const RenameButton: React.FC<RenameButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <SmallButton
      svgIcon={renameIcon}
      appearance='borderless-semitransparent'
      onClick={() => {
        modals.push({
          id: props.modal.id,
          title: props.modal.title || 'Rename',
          content: (
            <EditNameForm
              initialValue={props.initialValue}
              onConfirm={(v) => {
                props.onConfirm(v);
                modals.pop();
              }}
              onCancel={modals.pop}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
      {...props.button}
    />
  );
}

export default RenameButton;
