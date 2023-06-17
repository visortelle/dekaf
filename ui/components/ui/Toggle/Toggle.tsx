import React from "react";
import s from "./Toggle.module.css";

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
};

const Toggle: React.FC<ToggleProps> = (props) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const toggle = () => props.onChange(!props.value);

  return (
    <div
      className={`${s.Toggle}
      ${props.value ? s.True : s.False}`}
      onClick={() => {
        bodyRef.current?.focus();
        toggle();
      }}
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
      <div className={s.Label}>{props.label}</div>
    </div>
  );
};

export default Toggle;
