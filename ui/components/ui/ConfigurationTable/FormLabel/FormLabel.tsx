import React from 'react';
import SvgIcon from '../../SvgIcon/SvgIcon';
import helpIcon from './help.svg';
import s from './FormLabel.module.css'
import ReactDOMServer from 'react-dom/server';

export type FormLabelProps = {
  content: React.ReactNode;
  help?: React.ReactElement | string;
  isRequired?: boolean;
};

const FormLabel: React.FC<FormLabelProps> = (props) => {
  return (
    <div
      className={`${s.FormLabel} ${props.help ? s.FormLabelWithHelp : ''}`}
      data-tip={typeof props.help === undefined ?
        undefined :
        ReactDOMServer.renderToStaticMarkup(typeof props.help === 'string' ? <>{props.help}</> : props.help || <></>)
      }
    >
      {props.content}
      {props.isRequired && <span className={s.Required}>*</span>}
      {props.help && (
        <div className={s.HelpIcon}>
          <SvgIcon svg={helpIcon} />
        </div>
      )}
    </div>
  );
}

export default FormLabel;
