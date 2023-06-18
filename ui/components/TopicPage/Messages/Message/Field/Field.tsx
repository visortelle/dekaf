import * as Notifications from '../../../../app/contexts/Notifications';
import s from './Field.module.css';
import { tooltipId } from '../../../../ui/Tooltip/Tooltip';

export type FieldProps = {
  value?: string | React.ReactElement,
  tooltip: React.ReactElement | undefined,
  isShowTooltips: boolean,
  rawValue?: string,
  title?: string,
  valueHref?: string,
}
const Field: React.FC<FieldProps> = (props) => {
  const { notifySuccess } = Notifications.useContext();
  const valueContent = props.value === undefined ? <div className={s.NoData}>-</div> : props.value;

  const copyRawValue = () => {
    if (props.rawValue === undefined) {
      return;
    }

    navigator.clipboard.writeText(props.rawValue);
    notifySuccess(`${props.title} value copied to clipboard.`);
  }

  let valueElement = (
    <div
      className={`${s.FieldValue} ${props.rawValue === undefined ? '' : s.ClickableFieldValue}`}
      title={props.rawValue}
      onClick={copyRawValue}
    >
      {valueContent}
    </div>
  );

  if (props.valueHref !== undefined) {
    valueElement = <a href={props.valueHref} className={`${s.FieldValue} ${s.FieldValueLink}`} title={props.rawValue}>{valueContent}</a>;
  }

  return (
    <div
      className={s.Field}
      data-tooltip-id={tooltipId}
      data-tooltip-html={(!props.isShowTooltips || props.rawValue === undefined) ? undefined : "Click to copy"}
    >
      {valueElement}
    </div>
  );
}

export default Field;
