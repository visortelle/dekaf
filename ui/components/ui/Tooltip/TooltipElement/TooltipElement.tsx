import React from "react";
import A from "../../A/A";
import s from "./TooltipElement.module.css";
import TooltipComponent from "../TooltipComponent";

type TooltipElementProps = {
  children?: React.ReactNode,
  tooltipHelp: React.ReactNode,
  link?: string,
}

const TooltipElement: React.FC<TooltipElementProps> = ({children, tooltipHelp, link}) => {
  const WrappedTooltipComponent = link
    ? (
      <A isExternalLink className={s.TooltipElement} href={link}>
        <TooltipComponent tooltipHelp={tooltipHelp}>
          {children}
        </TooltipComponent>
      </A>
    )
    : (
      <TooltipComponent tooltipHelp={tooltipHelp}>
        {children}
      </TooltipComponent>
    );

  return (
    <div className={s.TooltipElement}>
      {WrappedTooltipComponent}
    </div>
  );
};

export default TooltipElement;
