import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { mutate, useSWRConfig } from 'swr';

import * as Notifications from '../../app/contexts/Notifications';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../app/contexts/Modals/Modals';
import { DeleteTopicRequest } from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import ConfirmationDialog from '../../ui/ConfirmationDialog/ConfirmationDialog';
import { swrKeys } from '../../swrKeys';
import { routes } from '../../routes';
import { PulsarTopicPersistency } from '../../pulsar/pulsar-resources';

export type DeleteTopicProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicPersistency: PulsarTopicPersistency,
  navigate: NavigateFunction,
};

const DeleteDialog: React.FC<DeleteTopicProps> = (props) => {
  const modals = Modals.useContext();
  const { mutate } = useSWRConfig()
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const deleteTopic = async () => {
    try {
      const req = new DeleteTopicRequest();
      req.setTopicName(topicFqn);
      req.setForce(forceDelete);

      const res = await topicServiceClient.deleteTopic(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete topic: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`${props.topicPersistency === 'persistent' ? 'Persistent' : 'Non-persistent'} topic ${topicFqn} has been successfully deleted.`);

      const mutatePersistentTopics = mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: props.tenant, namespace: props.namespace }));
      const mutateNonPersistentTopics = mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: props.tenant, namespace: props.namespace }));

      await Promise.all([mutatePersistentTopics, mutateNonPersistentTopics]);

      props.navigate(routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace }));
      modals.pop();
    } catch (err) {
      notifyError(`Unable to delete topic: ${topicFqn}. ${err}`)
    }
  };

  const switchForceDelete = () => {
    setForceDelete(!forceDelete);
  }

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently delete the <strong>{props.topic}</strong> topic and close all producers, consumers, replicators.</div>
        </div>
      }
      forceDelete={forceDelete}
      switchForceDelete={switchForceDelete}
      onConfirm={deleteTopic}
      onCancel={modals.pop}
      forceDeleteInfo="Close all producer/consumer/replicator and delete topic forcefully."
      guard={topicFqn}
      type='danger'
    />
  );
}

export default DeleteDialog;
