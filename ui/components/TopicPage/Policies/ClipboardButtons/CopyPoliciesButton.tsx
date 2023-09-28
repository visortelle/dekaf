import copyIcon from "./icons/copy.svg";
import SmallButton from "../../../ui/SmallButton/SmallButton";
import React from "react";
import {sessionStorageKeys} from "../../../session-storage-keys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";
import {CopyPoliciesRequest} from "../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb";

type CopyPoliciesButtonProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent',
  isGlobal: boolean,
  sessionId: string | null,
  setSessionId: (sessionId: string) => void,
}

const CopyPoliciesButton: React.FC<CopyPoliciesButtonProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError, notifyWarn } = Notifications.useContext();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`

  const copyPoliciesToClipboard = React.useCallback(async () => {
    const req = new CopyPoliciesRequest()
    req.setTopicFqn(topicFqn);
    req.setIsGlobal(props.isGlobal);

    if (sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId)) {
      req.setPoliciesClipboardId(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId) ?? '');
    }

    const res = await topicPoliciesServiceClient.copyPolicies(req, {})
      .catch(err => notifyError(`Failed to copy namespace policies: ${err.message}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Failed to copy topic policies: ${res.getStatus()?.getMessage()}`);
      return;
    }

    sessionStorage.setItem(sessionStorageKeys.pulsocatBrowserSessionId, res.getPoliciesClipboardId());
    props.setSessionId(res.getPoliciesClipboardId());

    if (res.getErrorsMap().getEntryList().length > 0) {
      notifyWarn(
        <>
          <span>Failed to copy some policies:</span>
          <div>
            {res.getErrorsMap().getEntryList().map(([errorKey, errorDescription], index) => (
              <div key={index}><strong>{index + 1})</strong> {errorKey}: {errorDescription}</div>
            ))}
          </div>
        </>
      );
    }

    notifySuccess(props.isGlobal ? 'Global topic policies copied.' : 'Topic policies copied.');
  }, [topicFqn]);

  return (
    <SmallButton onClick={copyPoliciesToClipboard} type={"regular"} text={"Copy"} svgIcon={copyIcon}/>
  );
}

export default CopyPoliciesButton;