import React from "react";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb"
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import Select, {List} from "../../../ui/Select/Select";
import {PulsarTopicPersistency} from "../../../pulsar/pulsar-resources";
import Input from "../../../ui/Input/Input";
import * as I18n from "../../../app/contexts/I18n/I18n";
import {Int64Value} from "google-protobuf/google/protobuf/wrappers_pb";
import s from "./SkipMessages.module.css";

export type SkipMessagesProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
}

type SkipMessagesTarget = 'skip-all-messages' | 'skip-exact-number-of-messages'

const SkipMessages: React.FC<SkipMessagesProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const [skipMessagesTarget, setSkipMessagesTarget] = React.useState<SkipMessagesTarget>('skip-exact-number-of-messages');
  const [skipNumberOfMessages, setSkipNumberOfMessages] = React.useState<number>(0);

  const skipMessages = async () => {
    const req = new pb.SkipSubscriptionMessagesRequest();
    req.setTopicFqn(topicFqn);
    req.setSubscriptionName(props.subscription);

    if (skipMessagesTarget === 'skip-exact-number-of-messages') {
      const skipExactNumberMessages = new pb.SkipExactNumberMessages();
      skipExactNumberMessages.setNumberOfMessages(new Int64Value().setValue(skipNumberOfMessages));

      req.setSkipExactNumberMessages(skipExactNumberMessages);
    }
    if (skipMessagesTarget === 'skip-all-messages') {
      const skipAllMessages = new pb.SkipAllMessages();
      req.setSkipAllMessages(skipAllMessages);
    }

    const res = await topicServiceClient.skipSubscriptionMessages(req, {})
      .catch((err) => notifyError(err));

    if (res == undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to skip messages on subscription. ${res.getStatus()?.getMessage()}`,
        crypto.randomUUID()
      );
      return;
    }

    notifySuccess('Messages were successfully skipped.', crypto.randomUUID());
    modals.pop();
  }

  const list: List<SkipMessagesTarget> = [
    {
      type: 'item',
      value: 'skip-exact-number-of-messages',
      title: "Skip exact number of messages"
    },
    {
      type: 'item',
      value: 'skip-all-messages',
      title: "Skip all messages"
    },
  ]

  return (
    <ConfirmationDialog
      content={
        <div className={s.ConfirmationDialogContentWrapper}>
          <div>
            <div>Select skip target:</div>
            <Select<SkipMessagesTarget>
              value={skipMessagesTarget}
              onChange={setSkipMessagesTarget}
              list={list}
            />
          </div>

          {skipMessagesTarget === 'skip-exact-number-of-messages' &&
            <div className={s.NumberOfMessages}>
              <span>Number of messages</span>
              <Input
                type={'number'}
                placeholder={"0"}
                value={skipNumberOfMessages.toString()}
                onChange={(numberOfMessages) => setSkipNumberOfMessages(parseInt(numberOfMessages))}
                focusOnMount
              />
            </div>
          }
          <div className={s.Info}>
            You can use this function to manually skip a number of messages or all messages for a specific subscription.
          </div>
        </div>
      }
      onConfirm={skipMessages}
      onCancel={modals.pop}
      guard={"CONFIRM"}
      type='danger'
    />
  );
}

export default SkipMessages;
