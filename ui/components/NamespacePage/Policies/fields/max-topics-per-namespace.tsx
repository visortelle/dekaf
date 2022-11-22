import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const policy = 'maxTopicsPerNamespace';

type PolicyValue = { type: 'inherited-from-broker-config' } | { type: 'unlimited' } | {
  type: 'specified-for-this-namespace',
  maxTopicsPerNamespace: number,
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMaxTopicsPerNamespaceRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getMaxTopicsPerNamespace(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get max topics per namespace: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getMaxTopicsPerNamespaceCase()) {
        case pb.GetMaxTopicsPerNamespaceResponse.MaxTopicsPerNamespaceCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetMaxTopicsPerNamespaceResponse.MaxTopicsPerNamespaceCase.SPECIFIED: {
          const maxTopicsPerNamespace = res.getSpecified()?.getMaxTopicsPerNamespace() ?? 0;

          if (maxTopicsPerNamespace === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', maxTopicsPerNamespace };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get max topics per namespace. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveMaxTopicsPerNamespaceRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeMaxTopicsPerNamespace(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max topics per namespace: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'unlimited' || value.type === 'specified-for-this-namespace') {
          const req = new pb.SetMaxTopicsPerNamespaceRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'unlimited') {
            req.setMaxTopicsPerNamespace(0);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setMaxTopicsPerNamespace(value.maxTopicsPerNamespace);
          }

          const res = await namespaceServiceClient.setMaxTopicsPerNamespace(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max topic per namespace: ${res.getStatus()?.getMessage()}`);
          }
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'unlimited', title: 'Unlimited' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'inherited-from-broker-config': onChange({ type: 'inherited-from-broker-config' }); break;
                    case 'unlimited': onChange({ type: 'unlimited' }); break;
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', maxTopicsPerNamespace: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <Input
                type="number"
                value={value.maxTopicsPerNamespace.toString()}
                onChange={v => onChange({ type: 'specified-for-this-namespace', maxTopicsPerNamespace: parseInt(v) })}
              />
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Max topics per namespace',
  description: <span>Max topics per namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
