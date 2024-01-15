import React from "react";
import s from "./FormLabel.module.css";
import HelpIcon from "../HelpIcon/HelpIcon";

export type FormLabelProps = {
  content: React.ReactNode;
  help?: React.ReactElement | string;
  isRequired?: boolean;
};

const FormLabel: React.FC<FormLabelProps> = (props) => {
  return (
    <div className={`${s.FormLabel} ${props.help === undefined ? '' : s.WithHelp}`}>
      {props.content}
      {props.isRequired && <span className={s.Required}>*</span>}
      {props.help && (
        <div className={s.HelpIcon}>
          <HelpIcon help={props.help} />
        </div>
      )}
    </div>
  );
};

export default FormLabel;
