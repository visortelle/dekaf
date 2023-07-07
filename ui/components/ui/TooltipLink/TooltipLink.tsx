import React from "react";
import A from "../A/A";
import s from "./TooltipLink.module.css";
import TooltipComponent from "../Tooltip/TooltipComponent";

type TooltipLinkProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  tooltipHelp: React.ReactNode,
  link: string,
}

const TooltipLink: React.FC<TooltipLinkProps> = ({children, tooltipHelp, link}) => {
  return (
      <A isExternalLink className={s.TooltipLink} href={link}>
      <TooltipComponent tooltipHelp={tooltipHelp}>
        {children}
      </TooltipComponent>
    </A>
  );
}

export default TooltipLink;
