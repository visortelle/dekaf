import React from 'react';
import Button from '../../Button/Button';
import s from './UpdateConfirmation.module.css'

export type ValidationError = React.ReactElement | undefined;

export type UpdateConfirmationProps = {
  onReset: () => void,
  onConfirm: () => void,
  validationError?: ValidationError,
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
        <Button testId="update-confirm-reset" type="regular" onClick={props.onReset} text="Reset" />
        <Button testId="update-confirm-save" type="primary" onClick={props.onConfirm} text="Save" disabled={props.validationError !== undefined}/>
      </div>
    </>

  );
}

export default UpdateConfirmation;
