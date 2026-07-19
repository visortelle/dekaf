import * as Notifications from '../../../../app/contexts/Notifications';
import { copyToClipboard, copyFailureMessage } from "../../../../app/clipboard";
import s from './Field.module.css';
import { tooltipId } from '../../../Tooltip/Tooltip';

export type FieldProps = {
  value?: string | React.ReactElement,
  tooltip: React.ReactElement | undefined,
  isShowTooltips: boolean,
  rawValue?: string,
  title?: string,
  valueHref?: string,
  testId?: string,
}
const Field: React.FC<FieldProps> = (props) => {
  const { notifySuccess, notifyWarn } = Notifications.useContext();
  const valueContent = props.value === undefined ? <div className={s.NoData}>-</div> : props.value;

  const copyRawValue = () => {
    if (props.rawValue === undefined) {
      return;
    }

    void copyToClipboard(props.rawValue).then((ok) => {
      if (ok) notifySuccess(`${props.title} value copied to clipboard.`);
      else notifyWarn(copyFailureMessage());
    });
  }

  const dataTooltipProps = props.isShowTooltips ? {
    // It looks like React-tooltip has some bug,
    // that affects the app responsiveness sometimes,
    // if we pass the data-* attributes directly on frequently-changing items.
    "data-tooltip-id": tooltipId,
    "data-tooltip-html": (!props.isShowTooltips || props.rawValue === undefined) ? undefined : "Click to copy"
  } : {};

  let valueElement = (
    <div
      className={`${s.FieldValue} ${props.rawValue === undefined ? '' : s.ClickableFieldValue}`}
      title={props.rawValue}
      data-testid={props.testId}
      onClick={(event) => {
        event.stopPropagation();
        copyRawValue();
      }}
      {...dataTooltipProps}
    >
      {valueContent}
    </div>
  );

  if (props.valueHref !== undefined) {
    valueElement = <a href={props.valueHref} data-testid={props.testId} className={`${s.FieldValue} ${s.FieldValueLink}`} title={props.rawValue}>{valueContent}</a>;
  }

  return (
    <div
      className={s.Field}
    >
      {valueElement}
    </div>
  );
}

export default Field;
