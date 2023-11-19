import { ReactNode, useState } from "react";

import Button from "../Button/Button";
import { DefaultProvider } from "../../app/contexts/Modals/Modals";

import s from "./ConfirmationDialog.module.css";
import Checkbox from "../Checkbox/Checkbox";
import Input from "../Input/Input";

type Props = {
  content: ReactNode;
  onConfirm: () => void;
  isConfirmDisabled?: boolean;
  onCancel: () => void;
  switchForceDelete?: () => void; // TECH_DEBT_SMALL: remove this property
  forceDelete?: boolean; // TECH_DEBT_SMALL: remove this property
  forceDeleteInfo?: React.ReactNode; // TECH_DEBT_SMALL: remove this property
  guard?: string; // TECH_DEBT_SMALL: rename ???
  type?: 'normal' | 'danger',
}

const ConfirmationDialog = (props: Props) => {
  const { switchForceDelete, forceDelete } = props;

  const [guard, setGuard] = useState("");

  return (
    <DefaultProvider>
      <div className={s.ConfirmationDialog}>
        {props.content}

        {props.guard && (
          <div className={`${s.Guard}`}>
            <span>
              Please type <strong>{props.guard}</strong> in the input to confirm.
            </span>
            <Input value={guard} onChange={(v) => setGuard(v)} placeholder={props.guard} testId="confirmation-dialog-guard-input" />
          </div>
        )}

        {switchForceDelete && (
          <div className={s.ActionCheckbox}>
            <div className={s.ForceDeleteCheckbox}>
              <Checkbox isInline id="forceDelete" checked={forceDelete} onChange={() => switchForceDelete()} />
            </div>
            <div className={s.ForceDeleteInfo}>
              <label data-testid="confirm-dialog-force-delete-checkbox" htmlFor="forceDelete">
                {props.forceDeleteInfo}
              </label>
            </div>
          </div>
        )}

        <div className={s.ActionButtons}>
          <Button type="regular" text={`Cancel`} onClick={() => props.onCancel()} />
          <Button
            type={props.type === 'danger' ? 'danger': 'primary'}
            text={`Confirm`}
            onClick={() => props.onConfirm()}
            disabled={(props.guard !== undefined && props.guard !== guard) || props.isConfirmDisabled}
            testId="confirmation-dialog-confirm-button"
          />
        </div>
      </div>
    </DefaultProvider>
  );
};

export default ConfirmationDialog;
