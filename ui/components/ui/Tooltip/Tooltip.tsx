import React from 'react';
import s from './Tooltip.module.css'
import { Tooltip as ReactTooltip } from 'react-tooltip';
import ReactDOM from 'react-dom';

export type TooltipProps = {
};

const domNode = document.createElement('div');
domNode.id = 'react-tooltip-root';
domNode.style.position = 'fixed';
domNode.style.zIndex = '999';
document.body.appendChild(domNode);

function BodyPortal({ children }: { children: React.ReactNode }) {
  return ReactDOM.createPortal(
    children,
    domNode
  );
}

export const tooltipId = `pulsar-ui-react-tooltip`;

const Tooltip: React.FC<TooltipProps> = (props) => {
  return (
    <BodyPortal>
      <ReactTooltip id={tooltipId} className={s.Tooltip} clickable delayShow={250}/>
    </BodyPortal>
  );
}

export default Tooltip;
