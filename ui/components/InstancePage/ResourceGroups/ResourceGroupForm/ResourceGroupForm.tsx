import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Int32Value,
  Int64Value,
} from "google-protobuf/google/protobuf/wrappers_pb";
import { isEqual } from 'lodash';
import { mutate } from 'swr';

import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { H1 } from '../../../ui/H/H';
import ConfigurationTable from '../../../ui/ConfigurationTable/ConfigurationTable';
import Button from '../../../ui/Button/Button';
import Input from '../../../ui/Input/Input';
import * as Modals from '../../../app/contexts/Modals/Modals';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import { routes } from '../../../routes';
import { swrKeys } from '../../../swrKeys';
import DeleteDialog from './DeleteDialog/DeleteDialog';

import s from './ResourceGroupForm.module.css';

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
  const modals = Modals.useContext();

  const { notifyError } = Notifications.useContext();
  const { brokersServiceClient } = GrpcClient.useContext();

  const [formValue, setFormValue] = useState<Value | undefined>(undefined);
  const [initialFormValue, setInitialFormValue] = useState<Value | undefined>(undefined);

  useEffect(() => {
    const getDefaultFormValue = async (): Promise<Value | undefined> => {
      if (props.view.type === 'create') {
        return {
          name: ``,
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

    await mutate(swrKeys.pulsar.brokers.resourceGroups._());
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

  const resourceGroupNameInput = (
    <Input
      value={formValue.name}
      onChange={(v) => setFormValue({ ...formValue, name: v })}
      placeholder="new-resource-group"
      testId="resource-group-name"
    />
  );
  const resourceGroupNameSpan = <span data-testid="resource-group-name">{formValue.name}</span>;
  const dispatchRateInBytesInput = (
    <Input
      type="number"
      value={formValue.dispatchRateInBytes || ''}
      onChange={(v) => setFormValue({ ...formValue, dispatchRateInBytes: v })}
      placeholder="1024"
      testId="dispatch-rate-in-bytes"
    />
  );
  const dispatchRateInMsgsInput = (
    <Input
      type="number"
      value={formValue.dispatchRateInMsgs || ''}
      onChange={(v) => setFormValue({ ...formValue, dispatchRateInMsgs: v })}
      placeholder="100"
      testId="dispatch-rate-in-msgs"
    />
  );
  const publishRateInBytesInput = (
    <Input
      type="number"
      value={formValue.publishRateInBytes || ''}
      onChange={(v) => setFormValue({ ...formValue, publishRateInBytes: v })}
      placeholder="1024"
      testId="publish-rate-in-bytes"
    />
  );
  const publishRateInMsgsInput = (
    <Input
      type="number"
      value={formValue.publishRateInMsgs || ''}
      onChange={(v) => setFormValue({ ...formValue, publishRateInMsgs: v })}
      placeholder="100"
      testId="publish-rate-in-msgs"
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
                buttonProps={{ type: 'submit' }}
                text='Delete'
                type='danger'
                onClick={() => modals.push({
                  id: 'delete-resource-group',
                  title: `Delete resource group`,
                  content: <DeleteDialog resourceGroup={formValue.name} navigate={navigate} />,
                  styleMode: 'no-content-padding'
                })}
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
          disabled={formValue.name.length === 0}
        />
      )}
    </form>
  );
};

export default ResourceGroupForm;
