import { useState } from "react";
import Input from "../../Input/Input";
import Button from "../../Button/Button";
import s from './EditNameDialog.module.css';

type EditNameDialogProps = {
  initialValue: string,
  onConfirm: (v: string) => void,
  onCancel: () => void,
};
const EditNameDialog: React.FC<EditNameDialogProps> = (props) => {
  const [value, setValue] = useState(props.initialValue);

  const confirm = () => {
    if (value.length === 0) {
      return;
    }

    props.onConfirm(value)
  };

  return (
    <div
      className={s.EditNameDialog}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          confirm();
        }
      }}
    >
      <div className={s.EditNameDialogContent}>
        <Input value={value} onChange={setValue} focusOnMount />
      </div>
      <div className={s.EditNameDialogFooter}>
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

export default EditNameDialog
