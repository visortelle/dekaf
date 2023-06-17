import React from 'react';
import s from './InstanceColor.module.css'
import { createPortal } from 'react-dom';

export type InstanceColorProps = {
  color?: string,
};

const InstanceColor: React.FC<InstanceColorProps> = (props) => {
  const boxShadow = props.color === undefined ? 'none' : `0 0 0px 2px ${props.color} inset`

  const portal = createPortal(
    (<div className={s.InstanceColor} style={{ boxShadow }} />),
    document.body
  );
  return <>{portal}</>;
}

export default InstanceColor;
