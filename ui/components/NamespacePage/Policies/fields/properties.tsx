import useSWR, {useSWRConfig} from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import {Code} from '../../../../grpc-web/google/rpc/code_pb';
import {ConfigurationField} from "../../../ui/ConfigurationTable/ConfigurationTable";
import KeyValueEditor from '../../../ui/KeyValueEditor/KeyValueEditor';
import {swrKeys} from '../../../swrKeys';
import {mapToObject} from '../../../../pbUtils/pbUtils';
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { help } from "../../../TenantPage/Namespaces/help";
import React from "react";

const policy = 'properties';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type Properties = {
  [key: string]: string
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPropertiesRequest();
      req.setNamespacesList([`${props.tenant}/${props.namespace}`]);

      const res = await namespaceServiceClient.getProperties(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        throw new Error(`Unable to get properties. ${res.getStatus()?.getMessage()}`);
      }

      const propertiesPb = mapToObject(res.getPropertiesMap())[`${props.tenant}/${props.namespace}`];
      return mapToObject(propertiesPb.getPropertiesMap());
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get properties. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const onSave = async (properties: Properties) => {
    const req = new pb.SetPropertiesRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);

    Object.entries(properties).map(([key, value]) => {
      req.getPropertiesMap().set(key, value)
    })
    const res = await namespaceServiceClient.setProperties(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to set properties. ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  return (
    <WithUpdateConfirmation<Properties>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={onSave}
    >
      {({ value, onChange }) => (
        <KeyValueEditor
          value={value}
          onChange={onChange}
          height="300rem"
          testId="properties"
        />
      )}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Properties',
  description: <span>{help["properties"]}</span>,
  input: <FieldInput {...props} />
});

export default field;
