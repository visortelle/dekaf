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

  const handleCopyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (props.rawValue === undefined || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    // A copyable value is an interaction even though it deliberately remains a div to preserve
    // the compact table layout. Give keyboard users the same action as a click; preventing the
    // Space default also keeps the surrounding message list from scrolling unexpectedly.
    event.preventDefault();
    event.stopPropagation();
    copyRawValue();
  };

  let valueElement = (
    <div
      className={`${s.FieldValue} ${props.rawValue === undefined ? '' : s.ClickableFieldValue}`}
      title={props.rawValue}
      data-testid={props.testId}
      role={props.rawValue === undefined ? undefined : 'button'}
      tabIndex={props.rawValue === undefined ? undefined : 0}
      aria-label={props.rawValue === undefined ? undefined : `Copy ${props.title ?? 'value'}`}
      onClick={(event) => {
        event.stopPropagation();
        copyRawValue();
      }}
      onKeyDown={handleCopyKeyDown}
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
