import React from 'react';
import s from './Subscriptions.module.css'

export type SubscriptionsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
};

const Subscriptions: React.FC<SubscriptionsProps> = (props) => {
  return (
    <div className={s.Subscriptions}>
      Subscriptions!
    </div>
  );
}

export default Subscriptions;
