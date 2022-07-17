import React from 'react';
import s from './SubscriptionCursor.module.css';

export type SubscriptionCursorProps = {};

const SubscriptionCursor: React.FC<SubscriptionCursorProps> = (props) => {
  return (
    <div className={s.SubscriptionCursor}>
      cursor
    </div>
  );
}

export default SubscriptionCursor;
