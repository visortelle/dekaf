import { BundleKey } from "../Overview";
import React from "react";
import * as pbn from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import s from './ClearBacklogBundle.module.css';

export type ClearBacklogBundleProps = {
  namespaceFqn: string,
  bundleKey: BundleKey,
}

const ClearBacklogBundle: React.FC<ClearBacklogBundleProps> = ({ namespaceFqn, bundleKey }) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const switchForceDelete = () => {
    setForceDelete(!forceDelete);
  }

  const clearBacklogBundle = async () => {
    const req = new pbn.ClearBundleBacklogRequest();
    req.setNamespace(namespaceFqn);
    req.setBundle(bundleKey);

    const res =
      await namespaceServiceClient.clearBundleBacklog(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to clear namespace bundle backlog. ${res.getStatus()?.getMessage()}`,
        crypto.randomUUID()
      );
      return;
    }

    notifySuccess('Namespace bundle backlog successfully cleared', crypto.randomUUID());
    modals.pop();
  }

  return (
    <ConfirmationDialog
      description={
        <div className={s.DialogContainer}>
          <div>This action <strong>cannot</strong> be undone.</div>
          <div>It will permanently clear <strong>FULL backlog</strong> of this bundle and could lead to severe consequences.</div>
        </div>
      }
      onConfirm={clearBacklogBundle}
      onCancel={modals.pop}
      guard={"Confirm clear bundle backlog"}
      type='danger'
    />
  );
}

export default ClearBacklogBundle;
