import React from "react";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb"
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import {PulsarTopicPersistency} from "../../../pulsar/pulsar-resources";
import Input from "../../../ui/Input/Input";
import {Int64Value} from "google-protobuf/google/protobuf/wrappers_pb";
import s from "./ExpireAllSubscriptions.module.css";
import A from "../../../ui/A/A";

export type ExpireAllMessagesProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
}

const ExpireAllSubscriptions: React.FC<ExpireAllMessagesProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const [expireTimeInSeconds, setExpireTimeInSeconds] = React.useState<number>(0);

  const expireAllSubscriptions = async () => {
    const req = new pb.ExpireMessagesRequest();
    req.setTopicFqn(topicFqn);

    const expireAllMessages = new pb.ExpireMessagesForAllSubscriptions();
    expireAllMessages.setTimeInSeconds(new Int64Value().setValue(expireTimeInSeconds));

    req.setExpireAllSubscriptions(expireAllMessages);

    const res = await topicServiceClient.expireMessages(req, {})
      .catch((err) => notifyError(err));

    if (res == undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to expire messages on a topic. ${res.getStatus()?.getMessage()}`,
        crypto.randomUUID()
      );
      return;
    }

    notifySuccess('Messages were successfully expired', crypto.randomUUID());
    modals.pop();
  }

  return (
    <ConfirmationDialog
      content={
        <div className={s.ConfirmationDialogContentWrapper}>
          <div className={s.TimeInSeconds}>
            <span>Expiration Time (Seconds)</span>
            <Input
              type={'number'}
              placeholder={"0"}
              value={expireTimeInSeconds.toString()}
              onChange={(timeInSeconds) => setExpireTimeInSeconds(parseInt(timeInSeconds))}
              focusOnMount
            />
          </div>

          <div className={s.Info}>
            You can use this function to manually expire messages from the backlog of <strong>all
            subscriptions</strong> (if Time-To-Live
            (TTL) setting is insufficient or not set).
            This functionality is particularly beneficial when the backlog of <strong>all subscriptions</strong> contain
            large amount of
            messages, and you wish to remove some of them.
            <br/>
            <A
              href={'https://pulsar.apache.org/docs/next/cookbooks-retention-expiry/#time-to-live-ttl'}
              isExternalLink
            >
              More info...
            </A>
          </div>
        </div>
      }
      onConfirm={expireAllSubscriptions}
      onCancel={modals.pop}
      guard={"CONFIRM"}
      type='danger'
    />
  );
}

export default ExpireAllSubscriptions;
