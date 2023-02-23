import React from 'react';
import { NavigateFunction } from 'react-router';
import { mutate } from 'swr';

import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import * as Notifications from '../../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { routes } from '../../../../../routes';
import { swrKeys } from '../../../../../swrKeys';
import ConfirmationDialog from '../../../../../ui/ConfirmationDialog/ConfirmationDialog';

type Props = {
  tenant: string,
  namespace: string,
  sink: string,
  navigate: NavigateFunction,
}

const DeleteDialog = (props: Props) => {

  const modals = Modals.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const { ioServiceClient } = PulsarGrpcClient.useContext();

  const deleteResourceGroup = async () => {
    const req = new pb.DeleteSinkRequest();
    req.setTenant(props.tenant);
    req.setNamespace(props.namespace);
    req.setSink(props.sink);

    const res = await ioServiceClient.deleteSink(req, null).catch(err => { `Unable to delete sink: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete sink: ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(<span>Sink <strong>{props.sink}</strong> has been deleted</span>, `sink-deleted-${props.sink}`);
    await setTimeout(() => {
      mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.io.sinks._({ tenant: props.tenant, namespace: props.namespace }));
    }, 300);
    
    props.navigate(routes.tenants.tenant.namespaces.namespace.io.sinks._.get({ tenant: props.tenant, namespace: props.namespace }));
    modals.pop();
  }

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently delete the {props.sink} sink.</div>
        </div>
      }
      onConfirm={deleteResourceGroup}
      onCancel={modals.pop}
      guard={props.sink}
      type='danger'
    />
  );
}

export default DeleteDialog