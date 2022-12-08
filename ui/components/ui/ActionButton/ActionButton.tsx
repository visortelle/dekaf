import React from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './ActionButton.module.css'
import Link from '../Link/Link';

import editIcon from './edit.svg';
import closeIcon from './close.svg';

export type ActionButtonProps = {
  action: { type: 'predefined', action: 'edit' | 'close' }
  onClick: () => void;
  linkTo?: string;
};

const ActionButton: React.FC<ActionButtonProps> = (props) => {
  let svgIcon;
  switch (props.action.action) {
    case 'edit': svgIcon = editIcon; break;
    case 'close': svgIcon = closeIcon; break;
  }

  const button = (
    <button type="button" className={s.ActionButton} onClick={props.onClick}>
      <SvgIcon svg={svgIcon} />
    </button>
  );

  return props.linkTo ? (
    <Link to={props.linkTo}>
      {button}
    </Link>
  ) : button
}

export default ActionButton;
