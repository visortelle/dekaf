import HelpIcon from '../ConfigurationTable/HelpIcon/HelpIcon';
import s from './H.module.css';

export type HProps = {
  children: React.ReactNode;
  help?: React.ReactElement | string;
}

export const H1: React.FC<HProps> = (props) => {
  return (
    <h1 className={s.H1}>
      {props.children}
      {props.help && (
        <div className={s.HelpIcon}>
          <HelpIcon help={props.help} />
        </div>
      )}
    </h1>
  );
}

export const H2: React.FC<HProps> = (props) => {
  return (
    <h2 className={s.H2}>
      {props.children}
      {props.help && (
        <div className={s.HelpIcon}>
          <HelpIcon help={props.help} />
        </div>
      )}
    </h2>
  );
}

export const H3: React.FC<HProps> = (props) => {
  return (
    <h3 className={s.H3}>
      {props.children}
      {props.help && (
        <div className={s.HelpIcon}>
          <HelpIcon help={props.help} />
        </div>
      )}
    </h3>
  );
}

