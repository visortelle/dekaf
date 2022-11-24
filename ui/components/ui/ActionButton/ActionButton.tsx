import React from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './ActionButton.module.css'

import editIcon from '!!raw-loader!./edit.svg';
import closeIcon from '!!raw-loader!./close.svg';

export type ActionButtonProps = {
  action: { type: 'predefined', action: 'edit' | 'close' }
  onClick: () => void;
};

const ActionButton: React.FC<ActionButtonProps> = (props) => {
  let svgIcon;
  switch (props.action.action) {
    case 'edit': svgIcon = editIcon; break;
    case 'close': svgIcon = closeIcon; break;
  }

  return (
    <button type="button" className={s.ActionButton} onClick={props.onClick}>
      <SvgIcon svg={svgIcon} />
    </button>
  );
}

export default ActionButton;
