import React from "react";
import s from "./Toggle.module.css";
import { tooltipId } from "../Tooltip/Tooltip";
import { renderToStaticMarkup } from "react-dom/server";

export type ToggleProps = {
  value: boolean,
  onChange: (value: boolean) => void,
  label?: string,
  help?: React.ReactElement | string,
  isReadOnly?: boolean
};

const Toggle: React.FC<ToggleProps> = (props) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const toggle = () => {
    if (props.isReadOnly) {
      return;
    }

    props.onChange(!props.value)
  };

  return (
    <div
      className={`${s.Toggle}
      ${props.value ? s.True : s.False}`}
      onClick={() => {
        bodyRef.current?.focus();
        toggle();
      }}
      data-tooltip-id={tooltipId}
      data-tooltip-html={renderToStaticMarkup(<>{props.help}</>)}
      data-tooltip-delay-show={500}
    >
      <div
        ref={bodyRef}
        className={s.Body}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className={s.Circle} />
      </div>
      <div className={s.Label}>
        {props.label}
      </div>
    </div>
  );
};

export default Toggle;
