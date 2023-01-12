import React from 'react';
import SvgIcon from '../../SvgIcon/SvgIcon';
import helpIcon from './help.svg';
import s from './FormLabel.module.css'
import { TooltipWrapper } from 'react-tooltip';
import { renderToStaticMarkup} from 'react-dom/server';

export type FormLabelProps = {
  content: React.ReactNode;
  help?: React.ReactElement | string;
  isRequired?: boolean;
};

const FormLabel: React.FC<FormLabelProps> = (props) => {
  return (
    <TooltipWrapper html={(typeof props.help === undefined) || (typeof props.help === 'string') ?
      renderToStaticMarkup(<>{props.help}</>) :
      renderToStaticMarkup(props.help || <></>)
    }>
      <div className={`${s.FormLabel} ${props.help ? s.FormLabelWithHelp : ''}`}>
        {props.content}
        {props.isRequired && <span className={s.Required}>*</span>}
        {props.help && (
          <div className={s.HelpIcon}>
            <SvgIcon svg={helpIcon} />
          </div>
        )}
      </div>
    </TooltipWrapper>
  );
}

export default FormLabel;
