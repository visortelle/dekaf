import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import { GetSchemaCompatibilityStrategyRequest, SchemaCompatibilityStrategy, SetSchemaCompatibilityStrategyRequest} from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";

const policy = 'schemaCompatibilityStrategy';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type Strategy = keyof typeof SchemaCompatibilityStrategy;
const strategies = (Object.keys(SchemaCompatibilityStrategy) as Strategy[])
  .filter(key => key !== 'SCHEMA_COMPATIBILITY_STRATEGY_UNSPECIFIED')
  .sort((a, b) => a.localeCompare(b));

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update schema compatibility strategy. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: strategy, error: strategyError } = useSWR(
    swrKey,
    async () => {
      const req = new GetSchemaCompatibilityStrategyRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getSchemaCompatibilityStrategy(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        return undefined;
      }
      return (Object.entries(SchemaCompatibilityStrategy).find(([_, i]) => i === res.getStrategy()) || [])[0] as Strategy;
    },
  );

  if (strategyError) {
    notifyError(`Can't get schema compatibility strategy: ${strategyError}`);
  }

  if (strategy === undefined) {
    return <></>;
  }

  return (
    <SelectInput<Strategy>
      list={strategies.map(s => ({ type: 'item', value: s, title: s.replace('SCHEMA_COMPATIBILITY_STRATEGY_', '') }))}
      value={strategy}
      onChange={async (v) => {
        const req = new SetSchemaCompatibilityStrategyRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);
        req.setStrategy(SchemaCompatibilityStrategy[v]);
        const res = await namespaceServiceClient.setSchemaCompatibilityStrategy(req, {}).catch(onUpdateError);

        if (res === undefined) {
          return;
        }
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Can't update schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Schema compatibility strategy',
  description: <span>Compatibility level required for new schemas created via a Producer.</span>,
  input: <FieldInput {...props} />
});

export default field;
