import React, { ReactNode } from 'react';
import s from './NothingToShow.module.css'

export type NothingToShowProps = {
  content?: ReactNode;
  reason?: 'no-items-found' | 'loading-in-progress' | 'no-content-found' | 'server-error';
};

const NothingToShow: React.FC<NothingToShowProps> = (props) => {
  let content: React.ReactNode;
  switch (props.reason) {
    case 'loading-in-progress':
      content = 'Loading...';
      break;
    case 'no-content-found':
      content="No content found.";
      break;
    case 'server-error':
        content="Server error occurred.";
        break;
    case 'no-items-found':
      content = 'No items found.';
  }

  return (
    <div className={s.NothingToShow}>
      {props.content}
      {!props.content && <div>{content}</div>}
    </div>
  );
}

export default NothingToShow;
