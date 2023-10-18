import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import { GetSchemaCompatibilityStrategyRequest, SchemaCompatibilityStrategy, SetSchemaCompatibilityStrategyRequest } from "../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import A from "../../../ui/A/A";

const policy = 'schemaCompatibilityStrategy';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = keyof typeof SchemaCompatibilityStrategy;
const strategies = (Object.keys(SchemaCompatibilityStrategy) as PolicyValue[])
  .filter(key => key !== 'SCHEMA_COMPATIBILITY_STRATEGY_UNSPECIFIED')
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update schema compatibility strategy. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new GetSchemaCompatibilityStrategyRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespacePoliciesServiceClient.getSchemaCompatibilityStrategy(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        return undefined;
      }
      return (Object.entries(SchemaCompatibilityStrategy).find(([_, i]) => i === res.getStrategy()) || [])[0] as PolicyValue;
    },
  );

  if (initialValueError) {
    notifyError(`Can't get schema compatibility strategy: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return <></>;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (v) => {
        const req = new SetSchemaCompatibilityStrategyRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);
        req.setStrategy(SchemaCompatibilityStrategy[v]);
        const res = await namespacePoliciesServiceClient.setSchemaCompatibilityStrategy(req, {}).catch(onUpdateError);

        if (res === undefined) {
          return;
        }
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Can't update schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        }

        await mutate(swrKey);

      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={strategies.map(s => ({ type: 'item', value: s, title: s.replace('SCHEMA_COMPATIBILITY_STRATEGY_', '') }))}
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
  title: 'Schema compatibility strategy',
  description:
    <span>
      Ensures that existing consumers can process the introduced messages.
      <ul>
        <li>
          <A isExternalLink href="https://pulsar.apache.org/docs/3.0.x/schema-understand/#schema-compatibility-check">More info about properties</A>
        </li>
      </ul>
    </span>,
  input: <FieldInput {...props} />
});

export default field;
