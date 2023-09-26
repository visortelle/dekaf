import copyIcon from "../../../ui/BreadCrumbs/copy.svg";
import SmallButton from "../../../ui/SmallButton/SmallButton";
import React from "react";
import {
  CopyNamespacePoliciesRequest
} from "../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb";
import {sessionStorageKeys} from "../../../session-storage-keys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";

type CopyPoliciesButtonProps = {
  tenant: string,
  namespace: string,
  sessionId: string | null,
  setSessionId: (sessionId: string) => void,
}

const CopyPoliciesButton: React.FC<CopyPoliciesButtonProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError, notifyWarn } = Notifications.useContext();

  const copyPoliciesToClipboard = React.useCallback(async () => {
    const req = new CopyNamespacePoliciesRequest()
    req.setNamespaceFqn(`${props.tenant}/${props.namespace}`);

    if (sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId)) {
      req.setPoliciesClipboardId(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId) ?? '');
    }

    const res = await namespacePoliciesServiceClient.copyNamespacePolicies(req, {})
      .catch(err => notifyError(`Failed to copy namespace policies: ${err.message}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Failed to copy namespace policies: ${res.getStatus()?.getMessage()}`);
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

    notifySuccess('Namespace policies copied.');
  }, [props.namespace]);

  return (
    <SmallButton onClick={copyPoliciesToClipboard} type={"regular"} text={"Copy"} svgIcon={copyIcon}/>
  );
}

export default CopyPoliciesButton;