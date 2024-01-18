import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import { GetIsAllowAutoUpdateSchemaRequest, SetIsAllowAutoUpdateSchemaRequest } from "../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import A from "../../../ui/A/A";

const policy = 'isAllowAutoUpdateSchema';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update is allow auto update schema. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new GetIsAllowAutoUpdateSchemaRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespacePoliciesServiceClient.getIsAllowAutoUpdateSchema(req, {}).catch(err => notifyError(`Can't get is allow auto update schema policy. ${err}`));
      if (res === undefined) {
        return;
      }

      return res.getIsAllowAutoUpdateSchema() ? 'enabled' : 'disabled';
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get is allow update schema policy: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (v) => {
        const req = new SetIsAllowAutoUpdateSchemaRequest();
        req.setIsAllowAutoUpdateSchema(v === 'enabled');
        req.setNamespace(`${props.tenant}/${props.namespace}`);

        const res = await namespacePoliciesServiceClient.setIsAllowAutoUpdateSchema(req, {}).catch(err => onUpdateError(err));
        if (res === undefined) {
          return;
        }
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Can't update is allow auto update schema. ${res.getStatus()?.getMessage()}`);
        }

        await mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={[{ type: 'item', value: 'disabled', title: 'Not allow' }, { type: 'item', value: 'enabled', title: 'Allow' }]}
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
  title: 'Allow auto update schema',
  description: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem'}}>
      <div>When a schema passes the schema compatibility check, the producer automatically updates this schema to the topic it produces.</div>
      <A href="https://pulsar.apache.org/docs/next/schema-understand/#schema-autoupdate" isExternalLink>Learn more</A>
    </div>
  ),
  input: <FieldInput {...props} />
});

export default field;
