import React from "react";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb"
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import Select, {List} from "../../../ui/Select/Select";
import {PulsarTopicPersistency} from "../../../pulsar/pulsar-resources";
import Toggle from "../../../ui/Toggle/Toggle";
import Input from "../../../ui/Input/Input";
import {messageIdFromString, messageIdToPb} from "../../../ui/ConsumerSession/conversions/conversions";
import {Int64Value} from "google-protobuf/google/protobuf/wrappers_pb";
import s from "./ExpireMessages.module.css";
import A from "../../../ui/A/A";

export type ExpireMessagesProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
}

type ExpireByMessageId = {
  messageId: string;
  isExcluded: boolean;
}

const defaultExpireByMessageId: ExpireByMessageId = { messageId: "", isExcluded: false };

type ExpirationTarget = 'expire-by-message-id' | 'expire-time-in-seconds'

const ExpireMessages: React.FC<ExpireMessagesProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const [expirationTarget, setExpirationTarget] = React.useState<ExpirationTarget>('expire-by-message-id');
  const [expireByMessageId, setExpireByMessageId] = React.useState<ExpireByMessageId>(defaultExpireByMessageId);
  const [expireTimeInSeconds, setExpireTimeInSeconds] = React.useState<number>(0);

  const [isMessageIdError, setIsMessageIdError] = React.useState<boolean>(false);

  const expireMessages = async () => {
    setIsMessageIdError(false);

    const req = new pb.ExpireMessagesRequest();
    req.setTopicFqn(topicFqn);

    const expireMessageBySubscriptionPb = new pb.ExpireMessagesSubscription();
    expireMessageBySubscriptionPb.setSubscriptionName(props.subscription);

    if (expirationTarget === 'expire-by-message-id') {
      const messageId = new pb.ExpireMessagesSubscription.ExpireByMessageId();
      try {
        const messageIdPb = messageIdToPb(messageIdFromString(expireByMessageId.messageId));
        messageId.setMessageId(messageIdPb);
        messageId.setIsExcluded(expireByMessageId.isExcluded);
      } catch (e) {
        setIsMessageIdError(true);
        return;
      }

      expireMessageBySubscriptionPb.setExpireByMessageId(messageId);
    }

    if (expirationTarget === 'expire-time-in-seconds') {
      expireMessageBySubscriptionPb.setTimeInSeconds(new Int64Value().setValue(expireTimeInSeconds));
    }


    req.setExpireSubscription(expireMessageBySubscriptionPb);

    const res = await topicServiceClient.expireMessages(req, {})
      .catch((err) => notifyError(err));

    if (res == undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to expire messages. ${res.getStatus()?.getMessage()}`,
        crypto.randomUUID()
      );
      return;
    }

    notifySuccess('Messages were successfully expired', crypto.randomUUID());
    modals.pop();
  }

  const list: List<ExpirationTarget> = [
    {
      type: 'item',
      value: 'expire-by-message-id',
      title: "Expire by Message ID"
    },
    {
      type: 'item',
      value: 'expire-time-in-seconds',
      title: "Expire messages older than N seconds"
    },
  ]

  return (
    <ConfirmationDialog
      content={
        <div className={s.ConfirmationDialogContentWrapper}>
          <div>
            <div>Select expiration target:</div>
            <Select<ExpirationTarget>
              value={expirationTarget}
              onChange={setExpirationTarget}
              list={list}
            />
          </div>

          {expirationTarget === 'expire-by-message-id' &&
            <div className={s.ExpireByMessageIdWrapper}>
              <div className={s.MessageId}>
                <span>Message ID</span>
                <Input
                  placeholder={"0867100018003000"}
                  value={expireByMessageId.messageId}
                  onChange={(id) => setExpireByMessageId(value => {
                    return {
                      ...value,
                      messageId: id
                    }
                  })}
                  isError={isMessageIdError}
                />
              </div>
              <div className={s.ToggleWrapper}>
                <Toggle
                  label={"Is Excluded"}
                  help={"Will message at passed in position also be expired."}
                  value={expireByMessageId.isExcluded}
                  onChange={() => setExpireByMessageId(value => {
                      return {
                        ...value,
                        isExcluded: !value.isExcluded
                      }
                    }
                  )}
                />
              </div>
            </div>
          }
          {expirationTarget === 'expire-time-in-seconds' &&
            <div className={s.TimeInSeconds}>
              <span>Time in seconds</span>
              <Input
                type={'number'}
                placeholder={"0"}
                value={expireTimeInSeconds.toString()}
                onChange={(timeInSeconds) => setExpireTimeInSeconds(parseInt(timeInSeconds))}
                focusOnMount
              />
            </div>
          }
          <div className={s.Info}>
            You can use this function to manually expire messages from the backlog of a subscription (if Time-To-Live (TTL) setting is insufficient or not set).
            This functionality is particularly beneficial when the subscription backlog contains an excessive number of messages, and you wish to remove some of them.
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
      onConfirm={expireMessages}
      onCancel={modals.pop}
      guard={"CONFIRM"}
      type='danger'
    />
  );
}

export default ExpireMessages;
