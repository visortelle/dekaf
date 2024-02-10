import React from "react";
import * as Modals from "../../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../app/contexts/GrpcClient/GrpcClient";
import * as pbn from "../../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../../grpc-web/google/rpc/code_pb";
import ConfirmationDialog from "../../../../ui/ConfirmationDialog/ConfirmationDialog";
import s from "../ClearBacklogBundle/ClearBacklogBundle.module.css";

export type ClearBacklogProps = {
  namespaceFqn: string,
  onClear: () => void
}

const ClearBacklog: React.FC<ClearBacklogProps> = ({ namespaceFqn, onClear }) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();

  const clearBacklog = async () => {
    const req = new pbn.ClearNamespaceBacklogRequest();
    req.setNamespace(namespaceFqn);

    const res =
      await namespaceServiceClient.clearNamespaceBacklog(req, null);

    onClear();

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to clear namespace backlog. ${res.getStatus()?.getMessage()}`,
        crypto.randomUUID()
      );
      return;
    }

    notifySuccess('Namespace backlog successfully cleared', crypto.randomUUID());
    modals.pop();
  }

  return (
    <ConfirmationDialog
      content={
        <div className={s.DialogContainer}>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div><strong>It will clear all messages in backlog of this bundle and could lead to a permanent data loss.</strong></div>
        </div>
      }
      onConfirm={clearBacklog}
      onCancel={modals.pop}
      guard={"CONFIRM"}
      type='danger'
    />
  );
}

export default ClearBacklog;
