import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";

export type ReplicationClustersInputProps = {
  tenant: string;
  namespace: string;
}

export const ReplicationClustersInput: React.FC<ReplicationClustersInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update replication clusters: ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'configuration', 'replicationClusters'];

  const { data: clusters, error: clustersError } = useSWR(
    ['pulsar', 'clusters'],
    async () => await adminClient.clusters.getClusters()
  );

  const { data: replicationClusters, error: replicationClustersError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getNamespaceReplicationClusters(props.tenant, props.namespace)
  );

  if (replicationClustersError) {
    notifyError(`Unable to get replication clusters list: ${replicationClustersError}`);
  }

  return <ListInput<string>
    value={replicationClusters || []}
    getId={(v) => v}
    renderItem={(v) => <div>{v}</div>}
    editor={{
      render: (v, onChange) => {
        if (typeof replicationClusters === 'undefined') {
          return <></>;
        }

        return (
          <SelectInput
            list={(clusters || []).filter(c => !replicationClusters.some(ac => ac === c)).map(c => ({ id: c, title: c }))}
            value={v}
            prependWithEmptyItem={true}
            onChange={onChange}
            placeholder="Select cluster"
          />
        )
      },
      initialValue: '',
    }}
    onRemove={(id) => {
      if (typeof replicationClusters === 'undefined') {
        return
      }

      (async () => {
        await adminClient.namespaces.setNamespaceReplicationClusters(props.tenant, props.namespace, replicationClusters.filter(r => r !== id)).catch(onUpdateError);
        await mutate(swrKey);
      })()
    }}
    onAdd={(v) => {
      (async () => {
        await adminClient.namespaces.setNamespaceReplicationClusters(props.tenant, props.namespace, [...replicationClusters || [], v]).catch(onUpdateError);
        await mutate(swrKey);
      })()
    }}
    isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty'))}
  />
}

export const replicationClustersField = (props: ReplicationClustersInputProps): ConfigurationField => ({
  id: 'replicationClusters',
  title: 'Replication clusters',
  description: 'List of clusters that will be used for replication',
  input: <ReplicationClustersInput {...props} />
});
