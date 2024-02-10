import React, { useRef, useState } from 'react';
import s from './RenameButton.module.css'
import * as Modals from '../../app/contexts/Modals/Modals';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';
import renameIcon from './rename.svg';
import EditNameDialog from './EditNameDialog/EditNameDialog';

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
            <EditNameDialog
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
