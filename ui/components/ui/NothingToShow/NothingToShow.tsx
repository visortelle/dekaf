import React, { ReactNode } from 'react';
import s from './NothingToShow.module.css'

export type NothingToShowProps = {
  content?: ReactNode;
  reason?: 'no-items-found' | 'loading-in-progress' | 'error';
};

const NothingToShow: React.FC<NothingToShowProps> = (props) => {
  let content: React.ReactNode;
  switch (props.reason) {
    case 'loading-in-progress':
      content = 'Loading...';
      break;
    default:
      content = 'No items to show.';
  }

  let className= s.NothingToShow;
  if (props.reason === 'error') {
    className += ` ${s.Error}`;
  }

  return (
    <div className={className}>
      {props.content}
      {!props.content && <div>{content}</div>}
    </div>
  );
}

export default NothingToShow;
