import useSWR from "swr";
import {swrKeys} from "../../../swrKeys";
import {sessionStorageKeys} from "../../../session-storage-keys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import s from "./PastePoliciesButton.module.css"
import React from "react";
import {
  GetClipboardPoliciesSourceRequest, GetClipboardPoliciesSourceResponse
} from "../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb";

type PastePoliciesDialogProps = {
  topicFqn: string,
  isGlobal: boolean,
  pastePoliciesFromClipboard: () => Promise<void>
}

const PastePoliciesDialog: React.FC<PastePoliciesDialogProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const modals = Modals.useContext();
  const {notifyError} = Notifications.useContext();

  const { data: clipboardPoliciesSource } = useSWR(
    swrKeys.pulsar.customApi.clipboard.clipboardPoliciesSource._(),
    async () => {
      const req = new GetClipboardPoliciesSourceRequest();
      req.setPoliciesClipboardId(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId) ?? '');

      const res = await topicPoliciesServiceClient.getClipboardPoliciesSource(req, {})
        .catch(err => notifyError(`Failed to get clipboard policies source: ${err.message}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Failed to get clipboard policies source: ${res.getStatus()?.getMessage()}`);
        return;
      }

      switch (res.getClipboardPoliciesSourceCase()) {
        case GetClipboardPoliciesSourceResponse.ClipboardPoliciesSourceCase.SPECIFIED:
          return {
            sourceTopicFqn: res.getSpecified()?.getSourceTopicFqn(),
            isSourceGlobal: res.getSpecified()?.getIsSourceGlobal()
          };
        case GetClipboardPoliciesSourceResponse.ClipboardPoliciesSourceCase.UNSPECIFIED:
          return undefined;
      }
    }
  )

  return (
    <ConfirmationDialog
      description={
        <div className={s.DialogContents}>
          <div>You're going to paste {props.isGlobal && <strong>global</strong>} topic policies.</div>
          <div>
            <div><strong>Source: </strong>
              {!clipboardPoliciesSource ? (
                <span style={{color: "red"}}>undefined</span>
              ) : (
                <span>{clipboardPoliciesSource.sourceTopicFqn}</span>
              )}
              {clipboardPoliciesSource && clipboardPoliciesSource.isSourceGlobal &&
                <span>(<strong>global</strong>)</span>
              }
            </div>
            <div><strong>Target: </strong>{props.topicFqn} {props.isGlobal && <span>(<strong>global</strong>)</span>}</div>
          </div>
          <div>
            <div>This action may lead to losing data in the target topic as a result of wrong policies.</div>
            <div>Be sure you know what you're doing.</div>
          </div>
        </div>
      }
      disabled={clipboardPoliciesSource === undefined}
      onConfirm={() => {
        props.pastePoliciesFromClipboard();
        modals.pop();
      }}
      onCancel={modals.pop}
      type='normal'
    />
  );
}

export default PastePoliciesDialog;