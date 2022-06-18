import React from 'react';
import Link from '../../ui/LinkWithQuery/LinkWithQuery';
import s from './Toolbar.module.css'
import Button, { ButtonProps } from '../Button/Button';

export type ToolbarProps = {
  buttons: ToolbarButtonProps[];
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  return (
    <div className={s.Toolbar}>
      {props.buttons.map((button, i) => {
        return <ToolbarButton key={i} {...button} />
      })}
    </div>
  );
}

export type ToolbarButtonProps = ButtonProps & {
  linkTo: string;
  position?: 'left' | 'right';
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = (props) => {
  return <div className={`${s.ToolbarButton} ${props.position === 'right' ? s.ToolbarButtonRight : ''}`}>
    <Link to={props.linkTo}>
      <Button
        title={props.title}
        onClick={props.onClick}
        type={props.type}
      />
    </Link>
  </div>
}

export default Toolbar;
