import React from 'react';
import Button from '../../Button/Button';
import s from './UpdateConfirmation.module.css'

export type ValidationError = React.ReactElement | undefined;

export type UpdateConfirmationProps = {
  onReset: () => void,
  onConfirm: () => void,
  validationError: ValidationError,
};

const UpdateConfirmation: React.FC<UpdateConfirmationProps> = (props) => {
  return (
    <>
      {props.validationError && (
        <div className={s.ValidationError}>
          {props.validationError}
        </div>
      )}

      <div className={s.Buttons}>
        <Button type="regular" onClick={props.onReset} text="Reset" />
        <Button type="primary" onClick={props.onConfirm} text="Update" disabled={props.validationError !== undefined}/>
      </div>
    </>

  );
}

export default UpdateConfirmation;
