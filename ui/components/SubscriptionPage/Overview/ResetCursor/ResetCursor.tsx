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
import * as I18n from "../../../app/contexts/I18n/I18n";
import {messageIdFromString, messageIdToPb} from "../../../ui/ConsumerSession/conversions/conversions";
import {Int64Value} from "google-protobuf/google/protobuf/wrappers_pb";
import s from "./ResetCursor.module.css";

export type ResetCursorProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
}

type ResetCursorByMessageId = {
  messageId: string;
  isExcluded: boolean;
}

const defaultResetCursorByMessageId: ResetCursorByMessageId = { messageId: "", isExcluded: false };

type ResetCursorTarget = 'reset-cursor-by-message-id' | 'reset-cursor-to-timestamp'

const ResetCursor: React.FC<ResetCursorProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const [resetCursorTarget, setResetCursorTarget] = React.useState<ResetCursorTarget>('reset-cursor-by-message-id');
  const [resetCursorByMessageId, setResetCursorByMessageId] = React.useState<ResetCursorByMessageId>(defaultResetCursorByMessageId);
  const [timestamp, setTimestamp] = React.useState<number>(0);

  const [isMessageIdError, setIsMessageIdError] = React.useState<boolean>(false);

  const resetCursor = async () => {
    setIsMessageIdError(false);

    const req = new pb.ResetCursorRequest();
    req.setTopicFqn(topicFqn);
    req.setSubscriptionName(props.subscription);

    if (resetCursorTarget === 'reset-cursor-by-message-id') {
      const messageId = new pb.ResetCursorByMessageId();
      try {
        const messageIdPb = messageIdToPb(messageIdFromString(resetCursorByMessageId.messageId));
        messageId.setMessageId(messageIdPb);
        messageId.setIsExcluded(resetCursorByMessageId.isExcluded);
      } catch (e) {
        setIsMessageIdError(true);
        return;
      }

      req.setResetByMessageId(messageId);
    }

    if (resetCursorTarget === 'reset-cursor-to-timestamp') {
      req.setTimestamp(new Int64Value().setValue(timestamp));
    }

    const res = await topicServiceClient.resetCursor(req, {})
      .catch((err) => notifyError(err));

    if (res == undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to reset cursor. ${res.getStatus()?.getMessage()}`,
        crypto.randomUUID()
      );
      return;
    }

    notifySuccess('Cursor was successfully reset', crypto.randomUUID());
    modals.pop();
  }

  const list: List<ResetCursorTarget> = [
    {
      type: 'item',
      value: 'reset-cursor-by-message-id',
      title: "Reset Cursor by Message ID"
    },
    {
      type: 'item',
      value: 'reset-cursor-to-timestamp',
      title: "Reset Cursor to Timestamp"
    },
  ]

  return (
    <ConfirmationDialog
      content={
        <div className={s.ConfirmationDialogContentWrapper}>
          <div>
            <div>Select reset subscription target:</div>
            <Select<ResetCursorTarget>
              value={resetCursorTarget}
              onChange={setResetCursorTarget}
              list={list}
            />

          </div>

          {resetCursorTarget === 'reset-cursor-by-message-id' &&
            <div className={s.ResetCursorWrapper}>
              <div className={s.MessageId}>
                <span>Message ID</span>
                <Input
                  placeholder={"0867100018003000"}
                  value={resetCursorByMessageId.messageId}
                  onChange={(id) => setResetCursorByMessageId(value => {
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
                  help={"Is the message with Message ID specified going to be excluded after cursor reset."}
                  value={resetCursorByMessageId.isExcluded}
                  onChange={() => setResetCursorByMessageId(value => {
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
          {resetCursorTarget === 'reset-cursor-to-timestamp' &&
            <div className={s.Timestamp}>
              <span>Timestamp</span>
              <Input
                type={'number'}
                placeholder={"0"}
                value={timestamp.toString()}
                onChange={(timestamp) => setTimestamp(parseInt(timestamp))}
                focusOnMount
              />
            </div>
          }
          <div className={s.Info}>
            You can use this function to manually reset subscription cursor to a specific message ID or timestamp.
          </div>
        </div>
      }
      onConfirm={resetCursor}
      onCancel={modals.pop}
      guard={"CONFIRM"}
      type='danger'
    />
  );
}

export default ResetCursor;
