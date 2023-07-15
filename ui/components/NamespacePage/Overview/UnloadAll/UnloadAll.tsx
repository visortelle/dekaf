import React from "react";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as pbn from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import s from "../UnloadBundle/UnloadBundle.module.css";

export type UnloadAllProps = {
  namespaceFqn: string,
}

const UnloadAll: React.FC<UnloadAllProps> = ({namespaceFqn}) => {
  const modals = Modals.useContext();
  const {notifyError, notifySuccess} = Notifications.useContext();
  const {namespaceServiceClient} = GrpcClient.useContext();

  const unloadAll = async () => {
    const req = new pbn.UnloadNamespaceRequest();
    req.setNamespace(namespaceFqn);

    const res =
      await namespaceServiceClient.unloadNamespace(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(
        `Unable to unload namespace. ${res.getStatus()?.getMessage()}`
      );
      return;
    }

    notifySuccess('Namespace successfully unloaded');
    modals.pop();
  }

  return (
    <ConfirmationDialog
      description={
        <div className={s.DialogContainer}>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>This releases the ownership of all topics under a specific namespace from the current broker, allowing them to be reassigned to another broker based on load conditions and could lead to severe consequences.</div>
        </div>
      }
      onConfirm={unloadAll}
      onCancel={modals.pop}
      type='danger'
    />
  );
}

export default UnloadAll;
