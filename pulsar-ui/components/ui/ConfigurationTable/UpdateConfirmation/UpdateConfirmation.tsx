import React from 'react';
import Button from '../../Button/Button';
import s from './UpdateConfirmation.module.css'

export type UpdateConfirmationProps = {
  onReset: () => void,
  onConfirm: () => void,
};

const UpdateConfirmation: React.FC<UpdateConfirmationProps> = (props) => {
  return (
    <div className={s.Buttons}>
      <Button type="regular" onClick={props.onReset} text="Reset" />
      <Button type="primary" onClick={props.onConfirm} text="Update" />
    </div>
  );
}

export default UpdateConfirmation;
