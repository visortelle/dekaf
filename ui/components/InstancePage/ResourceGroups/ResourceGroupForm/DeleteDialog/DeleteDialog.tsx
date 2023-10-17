import React from 'react';
import { NavigateFunction } from 'react-router';
import { mutate } from 'swr';

import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { routes } from '../../../../routes';
import { swrKeys } from '../../../../swrKeys';
import ConfirmationDialog from '../../../../ui/ConfirmationDialog/ConfirmationDialog';

type Props = {
  resourceGroup: string,
  navigate: NavigateFunction,
}

const DeleteDialog = (props: Props) => {

  const modals = Modals.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const { brokersServiceClient } = GrpcClient.useContext();

  const deleteResourceGroup = async () => {
    const req = new pb.DeleteResourceGroupRequest();
    req.setName(props.resourceGroup);

    const res = await brokersServiceClient.deleteResourceGroup(req, null).catch(err => { `Unable to delete resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(<span>Resource group <strong>{props.resourceGroup}</strong> has been deleted</span>, `resource-group-deleted-${props.resourceGroup}`);
    await setTimeout(() => {
      mutate(swrKeys.pulsar.brokers.resourceGroups._());
    }, 300)

    props.navigate(routes.instance.resourceGroups._.get());
    modals.pop();
  }

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently delete the <strong>{props.resourceGroup}</strong> resource group.</div>
        </div>
      }
      onConfirm={deleteResourceGroup}
      onCancel={modals.pop}
      guard={props.resourceGroup}
      type='danger'
    />
  );
}

export default DeleteDialog
