import React from "react";
import s from "./HelpIcon.module.css";
import SvgIcon from "../../SvgIcon/SvgIcon";
import helpIcon from "./help.svg";
import { TooltipWrapper } from "react-tooltip";
import { renderToStaticMarkup } from "react-dom/server";

export type HelpIconProps = {
  help: React.ReactElement | string;
};

const HelpIcon: React.FC<HelpIconProps> = (props) => {
  return (
    <TooltipWrapper html={renderToStaticMarkup(<>{props.help}</>)} className={s.HelpIcon}>
      <SvgIcon svg={helpIcon} />
    </TooltipWrapper>
  );
};

export default HelpIcon;
