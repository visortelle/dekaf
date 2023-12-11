import React from 'react';
import s from './Tooltip.module.css'
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { createPortal } from 'react-dom';

export const tooltipId = `pulsar-ui-react-tooltip`;

const Tooltip: React.FC = () => {
  return createPortal(
    <div className={s.TooltipRoot}>
      <ReactTooltip
        id={tooltipId}
        className={s.Tooltip}
        clickable
        delayHide={100}
        delayShow={500}
      />
    </div>,
    document.body
  );
}

export default Tooltip;
