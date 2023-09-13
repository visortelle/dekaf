import * as Notifications from '../../app/contexts/Notifications';
import s from './CopyField.module.css';
import { tooltipId } from '../Tooltip/Tooltip';
import React from "react";

export type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string | React.ReactElement,
  tooltip: React.ReactElement | undefined,
  isShowTooltips: boolean,
  rawValue?: string,
  title?: string,
  isTitleVisible?: boolean,
  valueHref?: string,
}
const CopyField: React.FC<FieldProps> = (props) => {
  const { notifySuccess } = Notifications.useContext();
  const valueContent = props.value === undefined ? <div className={s.NoData}>-</div> : props.value;

  const copyRawValue = () => {
    if (props.rawValue === undefined) {
      return;
    }

    navigator.clipboard.writeText(props.rawValue);
    notifySuccess(`${props.title ?? props.value} value copied to clipboard.`);
  }

  let valueElement = (
    <div
      className={`${s.FieldValue} ${props.rawValue === undefined ? '' : s.ClickableFieldValue}`}
      title={props.isTitleVisible ? props.rawValue : undefined}
      onClick={copyRawValue}
    >
      {valueContent}
    </div>
  );

  if (props.valueHref !== undefined) {
    valueElement = <a href={props.valueHref} className={`${s.FieldValue} ${s.FieldValueLink}`} title={props.isTitleVisible ? props.rawValue : undefined}>{valueContent}</a>;
  }

  return (
    <div
      className={`${s.Field} ${props.className ?? ''}`}
      data-tooltip-id={tooltipId}
      data-tooltip-html={(!props.isShowTooltips || props.rawValue === undefined) ? undefined : "Click to copy"}
    >
      {valueElement}
    </div>
  );
}

export default CopyField;
