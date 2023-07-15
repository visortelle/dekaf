import {BundleKey} from "../Overview";
import * as pbn from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import s from './UnloadBundle.module.css';
import React from "react";

export type UnloadBundleProps = {
  namespaceFqn: string,
  bundleKey: BundleKey,
}

const UnloadBundle: React.FC<UnloadBundleProps> = ({namespaceFqn, bundleKey}) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();

  const unloadBundle = async () => {
    const req = new pbn.UnloadNamespaceBundleRequest();
    req.setNamespace(namespaceFqn);
    req.setBundle(bundleKey);

    const res =
      await namespaceServiceClient.unloadNamespaceBundle(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to unload bundle namespace. ${res.getStatus()?.getMessage()}`
      );
      return;
    }

    notifySuccess('Namespace bundle successfully unloaded');
    modals.pop();
  }

  return (
    <ConfirmationDialog
      description={
        <div className={s.DialogContainer}>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>This releases the ownership of a bundle from a specific broker and that could lead to severe consequences.</div>
        </div>
      }
      onConfirm={unloadBundle}
      onCancel={modals.pop}
      type='danger'
    />
  );
}

export default UnloadBundle;
