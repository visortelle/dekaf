import React from 'react';
import s from './Subscriptions.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR from 'swr';
import Table from './Table/Table';

export type SubscriptionsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
};

const Subscriptions: React.FC<SubscriptionsProps> = (props) => {
  const { tenantServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  return (
    <div className={s.Subscriptions}>
      Subscriptions!
    </div>
  );
}

export default Subscriptions;
