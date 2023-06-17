import React, { ReactNode } from 'react';
import s from './NothingToShow.module.css'

export type NothingToShowProps = {
  content?: ReactNode;
};

const NothingToShow: React.FC<NothingToShowProps> = (props) => {
  return (
    <div className={s.NothingToShow}>
      {props.content}
      {!props.content && <div>Nothing to show.</div>}
    </div>
  );
}

export default NothingToShow;
