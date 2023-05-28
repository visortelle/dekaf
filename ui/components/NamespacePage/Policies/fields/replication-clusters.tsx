import Select, { ListItem } from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ui/ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import * as cpb from '../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb';
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { difference } from "lodash";
import stringify from "safe-stable-stringify";
import { useState } from "react";

const policy = 'replication-clusters';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = {
  replicationClusters: string[];
  availableClusters: string[];
};

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient, clustersServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const replicationClustersReq = new pb.GetReplicationClustersRequest();
      replicationClustersReq.setNamespace(`${props.tenant}/${props.namespace}`);

      const replicationClustersRes = await namespaceServiceClient.getReplicationClusters(replicationClustersReq, {});
      if (replicationClustersRes.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get replication clusters: ${replicationClustersRes.getStatus()?.getMessage()}`);
      }

      const replicationClusters = replicationClustersRes.getReplicationClustersList();

      const availableClustersReq = new cpb.GetClustersRequest();
      const availableClustersRes = await clustersServiceClient.getClusters(availableClustersReq, {});
      if (availableClustersRes.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get available clusters: ${availableClustersRes.getStatus()?.getMessage()}`);
      }

      const availableClusters = availableClustersRes.getClustersList();

      const v: PolicyValue = {
        replicationClusters,
        availableClusters
      }

      return v;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get replication clusters: ${initialValueError}`)
  }

  if (initialValue === undefined) {
    return <></>;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        const req = new pb.SetReplicationClustersRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);
        req.setReplicationClustersList(value.replicationClusters);

        const res = await namespaceServiceClient.setReplicationClusters(req, {});
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to set replication clusters: ${res.getStatus()?.getMessage()}`);
          return;
        }

        await mutate(swrKey);
        setKey(key + 1);
      }}
    >
      {({ value, onChange }) => {
        const replicationClusters = value?.replicationClusters ?? [];
        const availableClusters = value?.availableClusters ?? [];

        const hideAddButton = replicationClusters?.length === availableClusters?.length;

        return (
          <ListInput<string>
            value={value.replicationClusters}
            getId={(v) => v}
            renderItem={(v) => <div>{v}</div>}
            editor={hideAddButton ? undefined : {
              render: (v, onChange) => {
                const list = difference(availableClusters, replicationClusters)
                  .map<ListItem<string>>(c => ({ type: 'item', value: c, title: c || '' }));

                return (
                  <Select<string>
                    list={[{ type: 'empty', title: '' }, ...list]}
                    value={v}
                    onChange={(v) => onChange(v as string)}
                    placeholder="Select cluster"
                  />
                )
              },
              initialValue: undefined,
            }}
            onRemove={async (id) => {
              onChange({ ...value, replicationClusters: value.replicationClusters.filter(c => c !== id) })
            }}
            onAdd={hideAddButton ? undefined : (v) => {
              onChange({ ...value, replicationClusters: [...value.replicationClusters, v] });
            }}
            validate={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty'))}
          />
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Replication clusters',
  description: <span>List of clusters that will be used for replication.</span>,
  input: <FieldInput {...props} />
});

export default field;
