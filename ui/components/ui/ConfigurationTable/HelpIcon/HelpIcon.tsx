import React from "react";
import s from "./HelpIcon.module.css";
import SvgIcon from "../../SvgIcon/SvgIcon";
import helpIcon from "./help.svg";
import { renderToStaticMarkup } from "react-dom/server";
import { tooltipId } from "../../Tooltip/Tooltip";

export type HelpIconProps = {
  help: React.ReactElement | string;
};

const HelpIcon: React.FC<HelpIconProps> = (props) => {
  return (
    <div
      data-tooltip-id={tooltipId}
      data-tooltip-html={renderToStaticMarkup(<>{props.help}</>)}
      className={s.HelpIcon}
    >
      <SvgIcon svg={helpIcon} />
    </div>
  );
};

export default HelpIcon;
