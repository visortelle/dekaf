import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Int32Value,
  Int64Value,
} from "google-protobuf/google/protobuf/wrappers_pb";
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { H1 } from '../../../ui/H/H';
import ConfigurationTable from '../../../ui/ConfigurationTable/ConfigurationTable';
import Button from '../../../ui/Button/Button';
import Input from '../../../ui/Input/Input';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { routes } from '../../../routes';

import s from './ResourceGroupForm.module.css';
import { isEqual } from 'lodash';
import { mutate } from 'swr';
import { swrKeys } from '../../../swrKeys';

type Value = {
  name: string;
  dispatchRateInBytes?: string;
  dispatchRateInMsgs?: string;
  publishRateInBytes?: string;
  publishRateInMsgs?: string;
}
export type View = { type: 'create' } | { type: 'edit'; groupName: string };

function resourceGroupPbFromFormValue(v: Value): pb.ResourceGroup {
  const resourceGroupPb = new pb.ResourceGroup();

  resourceGroupPb.setName(v.name);
  resourceGroupPb.setDispatchRateInBytes(!v.dispatchRateInBytes ?
    undefined :
    new Int64Value().setValue(Number(v.dispatchRateInBytes))
  );
  resourceGroupPb.setDispatchRateInMsgs(!v.dispatchRateInMsgs ?
    undefined :
    new Int32Value().setValue(Number(v.dispatchRateInMsgs))
  );
  resourceGroupPb.setPublishRateInBytes(!v.publishRateInBytes ?
    undefined :
    new Int64Value().setValue(Number(v.publishRateInBytes))
  );
  resourceGroupPb.setPublishRateInMsgs(!v.publishRateInMsgs ?
    undefined :
    new Int32Value().setValue(Number(v.publishRateInMsgs))
  );

  return resourceGroupPb;
}

type Props = {
  view: View;
}

const ResourceGroupForm = (props: Props) => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const { brokersServiceClient } = PulsarGrpcClient.useContext();

  const [formValue, setFormValue] = useState<Value | undefined>(undefined);
  const [initialFormValue, setInitialFormValue] = useState<Value | undefined>(undefined);

  useEffect(() => {
    const getDefaultFormValue = async (): Promise<Value | undefined> => {
      if (props.view.type === 'create') {
        return {
          name: `new-resource-group-${Date.now()}`,
          dispatchRateInBytes: undefined,
          dispatchRateInMsgs: undefined,
          publishRateInBytes: undefined,
          publishRateInMsgs: undefined,
        }
      }

      if (props.view.type === 'edit') {
        const req = new pb.GetResourceGroupRequest();
        const res = await brokersServiceClient.getResourceGroup(req.setName(props.view.groupName), {});

        if (res === undefined) {
          return;
        }
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to get resource group: ${res.getStatus()?.getMessage()}`);
          return;
        }

        return {
          name: res.getResourceGroup()?.getName() || '',
          dispatchRateInBytes: String(res.getResourceGroup()?.getDispatchRateInBytes()?.getValue()) || '0',
          dispatchRateInMsgs: String(res.getResourceGroup()?.getDispatchRateInMsgs()?.getValue()) || '0',
          publishRateInBytes: String(res.getResourceGroup()?.getPublishRateInBytes()?.getValue()) || '0',
          publishRateInMsgs: String(res.getResourceGroup()?.getPublishRateInMsgs()?.getValue()) || '0',
        };
      }
    }

    getDefaultFormValue().then(v => {
      setFormValue(v);
      setInitialFormValue(v);
    });
  }, []);

  if (formValue === undefined) {
    return <></>;
  }

  const createResourceGroup = async () => {
    const req = new pb.CreateResourceGroupRequest();

    const resourceGroupPb = resourceGroupPbFromFormValue(formValue);
    req.setResourceGroup(resourceGroupPb);

    const res = await brokersServiceClient.createResourceGroup(req, null).catch(err => { `Unable to create resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    await mutate(swrKeys.pulsar.brokers.resourceGroups);
    navigate(routes.instance.resourceGroups._.get());
  }

  const updateResourceGroup = async () => {
    const req = new pb.UpdateResourceGroupRequest();
    const resourceGroupPb = resourceGroupPbFromFormValue(formValue);
    req.setResourceGroup(resourceGroupPb);

    const res = await brokersServiceClient.updateResourceGroup(req, null).catch(err => { `Unable to update resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    navigate(routes.instance.resourceGroups._.get());
  }

  const deleteResourceGroup = async () => {
    const req = new pb.DeleteResourceGroupRequest()
    req.setName(formValue.name)

    const res = await brokersServiceClient.deleteResourceGroup(req, null).catch(err => { `Unable to delete resource group: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(<span>Resource group <strong>{formValue.name}</strong> has been deleted</span>, `resource-group-deleted-${formValue.name}`);
    await setTimeout(() => {
      mutate(swrKeys.pulsar.brokers.resourceGroups._())
    }, 300)
    navigate(routes.instance.resourceGroups._.get());
  }

  const resourceGroupNameInput = (
    <Input
      value={formValue.name}
      onChange={(v) => setFormValue({ ...formValue, name: v })}
      placeholder="new-resource-group"
    />
  );
  const resourceGroupNameSpan = <span>{formValue.name}</span>;
  const dispatchRateInBytesInput = (
    <Input
      type="number"
      value={formValue.dispatchRateInBytes || ''}
      onChange={(v) => setFormValue({ ...formValue, dispatchRateInBytes: v })}
      placeholder="1024"
    />
  );
  const dispatchRateInMsgsInput = (
    <Input
      type="number"
      value={formValue.dispatchRateInMsgs || ''}
      onChange={(v) => setFormValue({ ...formValue, dispatchRateInMsgs: v })}
      placeholder="100"
    />
  );
  const publishRateInBytesInput = (
    <Input
      type="number"
      value={formValue.publishRateInBytes || ''}
      onChange={(v) => setFormValue({ ...formValue, publishRateInBytes: v })}
      placeholder="1024"
    />
  );
  const publishRateInMsgsInput = (
    <Input
      type="number"
      value={formValue.publishRateInMsgs || ''}
      onChange={(v) => setFormValue({ ...formValue, publishRateInMsgs: v })}
      placeholder="100"
    />
  );

  return (
    <form className={s.ResourceGroup} onSubmit={e => e.preventDefault()}>
      <div className={s.Title}>
        <H1>
          {props.view.type === 'create' && <>Create resource group</>}
          {props.view.type === 'edit' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              Update resource group
              <Button
                onClick={deleteResourceGroup}
                type='danger'
                text='Delete'
                buttonProps={{ type: 'submit' }}
              />
            </div>
          )}
        </H1>
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "resourceGroupName",
            title: "Name",
            description: <span></span>,
            input: props.view.type === 'edit' ? resourceGroupNameSpan : resourceGroupNameInput,
            isRequired: true,
          },
          {
            id: "dispatchRateInBytes",
            title: "Dispatch rate in bytes",
            description: <span></span>,
            input: dispatchRateInBytesInput,
          },
          {
            id: "dispatchRateInMsgs",
            title: "Dispatch rate in msgs",
            description: <span></span>,
            input: dispatchRateInMsgsInput,
          },
          {
            id: "publishRateInBytes",
            title: "Publish rate in bytes",
            description: <span></span>,
            input: publishRateInBytesInput,
          },
          {
            id: "publishRateInMsgs",
            title: "Publish rate in msgs",
            description: <span></span>,
            input: publishRateInMsgsInput,
          },
        ]}
      />
      {props.view.type === 'edit' && (
        <Button
          onClick={updateResourceGroup}
          type='primary'
          text='Save'
          disabled={isEqual(formValue, initialFormValue)}
          buttonProps={{ type: 'submit' }}
        />
      )}
      {props.view.type === 'create' && (
        <Button
          onClick={createResourceGroup}
          type='primary'
          text='Create'
          buttonProps={{ type: 'submit' }}
        />
      )}
    </form>
  );
};

export default ResourceGroupForm;
