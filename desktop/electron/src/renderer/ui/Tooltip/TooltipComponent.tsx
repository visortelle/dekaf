import React from "react";
import ReactDOMServer from "react-dom/server";
import {tooltipId} from "./Tooltip";

export type TooltipProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  tooltipHelp: React.ReactNode
}
const TooltipComponent: React.FC<TooltipProps> = ({children, tooltipHelp}) => {
  return (
    <div
      data-tooltip-id={tooltipId}
      data-tooltip-html={
          ReactDOMServer.renderToStaticMarkup(tooltipHelp ? <>{tooltipHelp}</> : <>-</>)
      }
    >
      {children}
    </div>
  );
}

export default TooltipComponent;
