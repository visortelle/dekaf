import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import { GetSchemaValidationEnforceRequest, SetSchemaValidationEnforceRequest } from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";

const policy = 'schemaValidationEnforce';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update schema validation enforce policy. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new GetSchemaValidationEnforceRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getSchemaValidationEnforce(req, {}).catch(err => notifyError(`Can't get schema validation enforce policy. ${err}`))
      if (res === undefined) {
        return;
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get schema validation enforce: ${res.getStatus()?.getMessage()}`);
        return;
      }
      return res.getSchemaValidationEnforced() ? 'enabled' : 'disabled';
    }
  );

  if (initialValueError) {
    notifyError(`Can't get schema validation enforce policy: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return <></>;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (v) => {
        const req = new SetSchemaValidationEnforceRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);
        req.setSchemaValidationEnforced(v === 'enabled');

        const res = await namespaceServiceClient.setSchemaValidationEnforce(req, {}).catch(err => onUpdateError(err));
        if (res === undefined) {
          return;
        }
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to update schema validation enforce: ${res.getStatus()?.getMessage()}`);
        }

        await mutate(swrKey);

      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={[
              { type: 'item', value: 'disabled', title: 'Not enforced' },
              { type: 'item', value: 'enabled', title: 'Enforced' }
            ]}
            value={value}
            onChange={onChange}
          />
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Schema validation enforce',
  description: <span>Set the schema whether open schema validation enforced.</span>,
  input: <FieldInput {...props} />
});

export default field;
