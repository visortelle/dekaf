import React from 'react';
import { NavigateFunction } from 'react-router-dom';

import * as Notifications from '../../app/contexts/Notifications';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../app/contexts/Modals/Modals';
import {
  DeleteSubscriptionRequest
} from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import ConfirmationDialog from '../../ui/ConfirmationDialog/ConfirmationDialog';
import { routes } from '../../routes';
import { PulsarTopicPersistency } from '../../pulsar/pulsar-resources';

export type DeleteSubscriptionProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicPersistency: PulsarTopicPersistency,
  subscription: string,
  navigate: NavigateFunction,
};

const DeleteSubscriptionDialog: React.FC<DeleteSubscriptionProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const deleteSubscription = async () => {
    try {
      const req = new DeleteSubscriptionRequest();
      req.setTopicFqn(topicFqn);
      req.setSubscriptionName(props.subscription);
      req.setIsForce(forceDelete);

      const res = await topicServiceClient.deleteSubscription(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete subscription: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`Subscription ${props.subscription} has been successfully deleted.`);

      props.navigate(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions._.get({ tenant: props.tenant, namespace: props.namespace, topicPersistency: props.topicPersistency, topic: props.topic }));
      modals.pop();
    } catch (err) {
      notifyError(`Unable to delete subscription: ${topicFqn}. ${err}`)
    }
  };

  const switchForceDelete = () => {
    setForceDelete(!forceDelete);
  }

  return (
    <ConfirmationDialog
      content={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently delete the <strong>{props.subscription}</strong> subscription. If the force flag set, it will also close all active consumers.</div>
        </div>
      }
      forceDelete={forceDelete}
      switchForceDelete={switchForceDelete}
      onConfirm={deleteSubscription}
      onCancel={modals.pop}
      forceDeleteInfo="Close all active consumer and delete subscription forcefully."
      guard={topicFqn}
      type='danger'
    />
  );
}

export default DeleteSubscriptionDialog;
