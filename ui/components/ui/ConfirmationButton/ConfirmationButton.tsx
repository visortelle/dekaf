import React from 'react';
import s from './ConfirmationButton.module.css'
import * as Modals from '../../app/contexts/Modals/Modals';
import ConfirmationDialog, { ConfirmationDialogProps } from '../ConfirmationDialog/ConfirmationDialog';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';

export type ConfirmationButtonProps = {
  modal: {
    id: string,
    title: string
  },
  dialog: Omit<ConfirmationDialogProps, 'onCancel'>
  button: Omit<SmallButtonProps, 'onClick'>
};

const ConfirmationButton: React.FC<ConfirmationButtonProps> = (props) => {
  const modals = Modals.useContext();

  const showModal = async () => {
    modals.push({
      id: props.modal.id,
      content: (
        <ConfirmationDialog
          {...props.dialog}
          onCancel={modals.pop}
        />
      ),
      title: props.modal.title,
      styleMode: 'no-content-padding'
    });
  };

  return (
    <div className={s.ConfirmationButton}>
      <SmallButton
        {...props.button}
        onClick={showModal}
      />
    </div>
  );
}

export default ConfirmationButton;
