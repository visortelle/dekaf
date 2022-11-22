import React, { useState } from 'react';
import { mutate } from 'swr';
import { useNavigate } from 'react-router-dom';

import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { 
  CreateResourceGroupRequest,
  UpdateResourceGroupRequest,
  DeleteResourceGroupRequest,
  ResourceGroup as ResourceGroupSettings
} from '../../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { H1 } from '../../../../ui/H/H';
import ConfigurationTable from '../../../../ui/ConfigurationTable/ConfigurationTable';
import Button from '../../../../ui/Button/Button';
import Input from '../../../../ui/Input/Input';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { swrKeys } from '../../../../swrKeys';
import { routes } from '../../../../routes';

import s from '../../../CreateTenant/CreateTenant.module.css'

interface Props {
  resourceGroupSettings?: ResourceGroupSettings
}

const ResourceGroup = (props: Props) => {
  const resourceGroup = new ResourceGroupSettings();
  const navigate = useNavigate();
  const { notifyError } = Notifications.useContext();
  const { brokersServiceClient } = PulsarGrpcClient.useContext();

  const { resourceGroupSettings } = props;

  const [resourceGroupName, setResourceGroupName] = useState(resourceGroupSettings?.getName() || '');
  const [dispatchRateInBytes, setDispatchRateInBytes] = useState(resourceGroupSettings?.getDispatchRateInBytes().toString() || '0');
  const [dispatchRateInMsgs, setDispatchRateInMsgs] = useState(resourceGroupSettings?.getDispatchRateInMsgs().toString() || '0');
  const [publishRateInBytes, setPublishRateInBytes] = useState(resourceGroupSettings?.getPublishRateInBytes().toString() || '0');
  const [publishRateInMsgs, setPublishRateInMsgs] = useState(resourceGroupSettings?.getPublishRateInMsgs().toString() || '0');

  const isFormValid = resourceGroupName.length > 0 &&
    dispatchRateInBytes !== null &&
    dispatchRateInMsgs !== null &&
    publishRateInBytes !== null &&
    publishRateInMsgs !== null
  
  const createResourceGroup = async () => {
    const req = new CreateResourceGroupRequest()
 
    resourceGroup.setName(resourceGroupName)
    resourceGroup.setDispatchRateInBytes(+dispatchRateInBytes)
    resourceGroup.setDispatchRateInMsgs(+dispatchRateInMsgs)
    resourceGroup.setPublishRateInBytes(+publishRateInBytes)
    resourceGroup.setPublishRateInMsgs(+publishRateInMsgs)

    req.setResourceGroup(resourceGroup)
    
    const res = await brokersServiceClient.createResourceGroup(req, null).catch(err => { `Unable to create resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    await mutate(swrKeys.pulsar.brokers.availableResourceGroups._());
    navigate(routes.instance.configuration.resourceGroups._.get());
  }

  const updateResourceGroup = async () => {
    const req = new UpdateResourceGroupRequest()
 
    resourceGroup.setName(resourceGroupName)
    resourceGroup.setDispatchRateInBytes(+dispatchRateInBytes)
    resourceGroup.setDispatchRateInMsgs(+dispatchRateInMsgs)
    resourceGroup.setPublishRateInBytes(+publishRateInBytes)
    resourceGroup.setPublishRateInMsgs(+publishRateInMsgs)

    req.setResourceGroup(resourceGroup)
    
    const res = await brokersServiceClient.updateResourceGroup(req, null).catch(err => { `Unable to update resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    await mutate(swrKeys.pulsar.brokers.availableResourceGroups._());
  }

  const deleteResourceGroup = async () => {
    const req = new DeleteResourceGroupRequest()
    req.setName(resourceGroupName)

    const res = await brokersServiceClient.deleteResourceGroup(req, null).catch(err => { `Unable to delete resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    await mutate(swrKeys.pulsar.brokers.availableResourceGroups._());
    navigate(routes.instance.configuration.resourceGroups._.get());
  }

  const resourceGroupNameInput = <Input value={resourceGroupName} onChange={setResourceGroupName} placeholder="Name" />;
  const resourceGroupNameSpan = <span>{resourceGroupName}</span>;
  const dispatchRateInBytesInput = <Input type="number" value={dispatchRateInBytes} onChange={setDispatchRateInBytes} placeholder="Dispatch rate in bytes" />;
  const dispatchRateInMsgsInput = <Input type="number" value={dispatchRateInMsgs} onChange={setDispatchRateInMsgs} placeholder="Dispatch rate in msgs" />;
  const publishRateInBytesInput = <Input type="number" value={publishRateInBytes} onChange={setPublishRateInBytes} placeholder="Publish rate in bytes" />;
  const publishRateInMsgsInput = <Input type="number" value={publishRateInMsgs} onChange={setPublishRateInMsgs} placeholder="Publish rate in msgs" />;

  return (
    <form className={s.CreateTenant} onSubmit={e => e.preventDefault()}>
      <div className={s.Title}>
        {resourceGroupSettings &&
          <H1>Update resource group</H1> ||
          <H1>Create resource group</H1>
        }
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "resourceGroupName",
            title: "Resource group name",
            description: <span></span>,
            input: resourceGroupSettings && resourceGroupNameSpan || resourceGroupNameInput,
            isRequired: true,
          },
          {
            id: "dispatchRateInBytes",
            title: "Dispatch rate in bytes",
            description: <span>List of clusters that this resource group is restricted on.</span>,
            input: dispatchRateInBytesInput,
            isRequired: true,
          },
          {
            id: "dispatchRateInMsgs",
            title: "Dispatch rate in msgs",
            description: <span>List of authenticated roles allowed to manage this resource group.</span>,
            input: dispatchRateInMsgsInput,
            isRequired: true,
          },
          {
            id: "publishRateInBytes",
            title: "Publish rate in bytes",
            description: <span>List of authenticated roles allowed to manage this resource group.</span>,
            input: publishRateInBytesInput,
            isRequired: true,
          },
          {
            id: "publishRateInMsgs",
            title: "Publish rate in msgs",
            description: <span>List of authenticated roles allowed to manage this resource group.</span>,
            input: publishRateInMsgsInput,
            isRequired: true,
          },
        ]}
      />
      {resourceGroupSettings &&
        <>
          <Button
            onClick={updateResourceGroup}
            type='primary'
            text='Update'
            disabled={
              resourceGroupSettings.getDispatchRateInBytes().toString() === dispatchRateInBytes &&
              resourceGroupSettings.getDispatchRateInMsgs().toString() === dispatchRateInMsgs &&
              resourceGroupSettings.getPublishRateInBytes().toString() === publishRateInBytes &&
              resourceGroupSettings.getPublishRateInMsgs().toString() === publishRateInMsgs
            }
            buttonProps={{
              type: 'submit'
            }}
          />
          <Button
            onClick={deleteResourceGroup}
            type='primary'
            text='Delete'
            buttonProps={{
              type: 'submit'
            }}
          />
        </> ||
        <Button
          onClick={createResourceGroup}
          type='primary'
          text='Create'
          disabled={!isFormValid}
          buttonProps={{
            type: 'submit'
          }}
        />
      }

    </form>
  )
};

export default ResourceGroup;