
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { ToolbarButton } from "../../../ui/Toolbar/Toolbar";
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { routes } from '../../../routes';
import { Link } from "react-router-dom";
import Button from "../../../ui/Button/Button";
import A from "../../../ui/A/A";

const policy = 'resourceGroup';

type PolicyValue = { type: 'undefined' } | {
  type: 'specified-for-this-namespace',
  resourceGroup: string;
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext()
  const { notifyError } = Notifications.useContext()
  const { mutate } = useSWRConfig()
  const [resourceGroupsList, setResourceGroupsList] = useState<string[]>([''])

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetResourceGroupRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getResourceGroup(req, {});
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      let value: PolicyValue = { type: 'undefined' };
      setResourceGroupsList(res.getResourceGroupsList())

      switch (res.getResourceGroupCase()) {
        case pb.GetResourceGroupResponse.ResourceGroupCase.UNSPECIFIED: {
          value = { type: 'undefined' };
          break;
        }
        case pb.GetResourceGroupResponse.ResourceGroupCase.SPECIFIED: {
          const resourceGroup = res.getSpecified()?.getResourceGroup() || '';
          value = { type: 'specified-for-this-namespace', resourceGroup: resourceGroup };
          break;
        }
      }

      return value;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get resource group policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        switch (value.type) {
          case 'undefined': {
            const req = new pb.RemoveResourceGroupRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);
            
            const res = await namespaceServiceClient.removeResourceGroup(req, {});

            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
          case 'specified-for-this-namespace': {
            const req = new pb.SetResourceGroupRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);
            req.setResourceGroup(value.resourceGroup);

            const res = await namespaceServiceClient.setResourceGroup(req, {});
            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
        }
        setTimeout(async () => {
          await mutate(swrKey);
        }, 300);
      }}
    >
      {({ value, onChange }) => (
        <>
          <div className={sf.FormItem}>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', title: 'Undefined', value: 'undefined' },
                { type: 'item', title: 'Specified for this namespace', value: 'specified-for-this-namespace' },
              ]}
              value={value.type}
              onChange={(type) => {
                if (type === 'specified-for-this-namespace') {
                  onChange({
                    type: 'specified-for-this-namespace', resourceGroup: resourceGroupsList[0]
                  });
                  return;
                }

                onChange({ type });
              }}
            />
          </div>
          {value.type === 'specified-for-this-namespace' &&
            <div style={{backgroundColor: 'rgba(150, 150, 150, 0.2)', padding: '10px', borderRadius: '15px', marginBottom: '10px'}}>
              <strong>If you do not have the required </strong>
              <A isExternalLink target="_blank" href={routes.instance.resourceGroups.create._.get()}>
                Create resource group
              </A>
            </div>
          }
          {value.type === 'specified-for-this-namespace' && resourceGroupsList.length !== 0 && (
            <div className={sf.FormItem}>
              <Select<string>
                list={resourceGroupsList.map(resourceGroup => { 
                  return {type: 'item', value: resourceGroup, title: resourceGroup}
                })}
                value={value.resourceGroup}
                onChange={(v) => {
                  onChange({
                    ...value,
                    resourceGroup: v
                  })
                }}
              />
            </div>
          )}
        </>
      )}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Resource group',
  description: <span>Set Resource group a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
