import React from 'react';
import s from './Pre.module.css'

export type PreProps = {
  children: React.ReactNode
};

const Pre: React.FC<PreProps> = (props) => {
  return (
    <div className={s.PreContainer}>
      <pre className={s.Pre}>
        {props.children}
      </pre>
    </div>
  );
}

export default Pre;
