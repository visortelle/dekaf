import React from 'react';

import { PulsarTopicPersistency } from "../../pulsar/pulsar-resources";
import ConfirmationDialog from "../../ui/ConfirmationDialog/ConfirmationDialog";
import * as Modals from '../../app/contexts/Modals/Modals';
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../app/contexts/Notifications";
import { UnloadTopicRequest } from "../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import { Code } from "../../../grpc-web/google/rpc/code_pb";

export type UnloadTopicDialogProps = {
    tenant: string,
    namespace: string,
    topic: string,
    topicPersistency: PulsarTopicPersistency,
};

const UnloadTopicDialog: React.FC<UnloadTopicDialogProps> = (props) => {
  const modals = Modals.useContext();
  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();

    const unloadTopic = async () => {
      try {
        const req = new UnloadTopicRequest()

        req.setTopicName(topicFqn)

        const res = await topicServiceClient.unloadTopic(req, {})
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to unload topic: ${res.getStatus()?.getMessage()}`);
          return;
        }
        notifySuccess(`${props.topicPersistency === 'persistent' ? 'Persistent' : 'Non-persistent'} topic ${topicFqn} has been successfully unloaded.`);

        modals.pop()
      } catch (err) {
        notifyError(`Unable to unload topic: ${topicFqn}. ${err}`)
      }
    }

  return (
    <ConfirmationDialog
      content={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will unload the <strong>{props.topic}</strong> topic. This will cause temporary unavailability and trigger client reconnections during the ownership transfer.</div>
        </div>
      }
      onConfirm={unloadTopic}
      onCancel={modals.pop}
      guard={topicFqn}
      type='danger'
    />
  );
}

export default UnloadTopicDialog
