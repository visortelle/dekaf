import React from 'react';
import Link from '../Link/Link';
import s from './Toolbar.module.css'
import Button, { ButtonProps } from '../Button/Button';
import { partition } from 'lodash';

export type ToolbarProps = {
  buttons: ToolbarButtonProps[];
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const [rightButtons, leftButtons] = partition(props.buttons, btn => btn.position === 'right');

  return (
    <div className={s.Toolbar}>
      <div className={s.ButtonGroup}>
        {leftButtons.map((button, i) => <ToolbarButton key={i} {...button} />)}
      </div>
      <div className={s.ButtonGroup}>
        {rightButtons.map((button, i) => <ToolbarButton key={i} {...button} />)}
      </div>

    </div>
  );
}

export type ToolbarButtonProps = ButtonProps & {
  linkTo?: string;
  position?: 'left' | 'right';
  disabled?: boolean;
  active?: boolean;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = (props) => {
  const button = (
    <Button
      text={props.text}
      onClick={props.onClick}
      type={props.type}
      testId={props.testId}
      disabled={props.disabled}
      active={props.active}
    //state={props.state}
    />
  );
  return <div className={`${s.ToolbarButton} ${props.position === 'right' ? s.ToolbarButtonRight : ''}`}>
    {props.linkTo ? (
      <Link to={props.linkTo}>
        {button}
      </Link>
    ) : button}
  </div>
}

export default Toolbar;
