import Select from '../../../ui/Select/Select';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import React from "react";

const policy = 'encryptionRequired';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = 'required' | 'not-required';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetEncryptionRequiredRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getEncryptionRequired(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      const initialValue: PolicyValue = res.getEncryptionRequired() ? 'required' : 'not-required';
      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get encryption required: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        const req = new pb.SetEncryptionRequiredRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);
        req.setEncryptionRequired(value === 'required');

        const res = await namespaceServiceClient.setEncryptionRequired(req, {}).catch(err => notifyError(`Unable to set encryption required policy: ${err}`));
        if (res === undefined) {
          return;
        }

        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(res.getStatus()?.getMessage());
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <div className={sf.FormItem}>
            <Select<PolicyValue>
              list={[
                { type: 'item', value: 'required', title: 'Required' },
                { type: 'item', value: 'not-required', title: 'Not required' },
              ]}
              value={value}
              onChange={onChange}
            />
          </div>
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Encryption required',
  description: <span>Enables or disables message encryption required for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
