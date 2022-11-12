import React, { useEffect, useState } from 'react';
import s from './CreateNamespace.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import ListInput from '../../ui/ConfigurationTable/ListInput/ListInput';
import SelectInput, { ListItem } from '../../ui/ConfigurationTable/SelectInput/SelectInput';
import Input from '../../ui/Input/Input';
import Button from '../../ui/Button/Button';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import useSWR, { mutate } from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListClustersRequest } from '../../../grpc-web/tools/teal/pulsar/ui/cluster/v1/cluster_pb';
import * as Either from 'fp-ts/Either';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import { H1 } from '../../ui/H/H';
import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import { CreateNamespaceRequest } from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';

export type CreateNamespaceProps = {
  tenant: string;
};

const CreateNamespace: React.FC<CreateNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { namespaceServiceClient, clusterServiceClient } = PulsarGrpcClient.useContext();
  const [namespaceName, setNamespaceName] = useState('');
  const [replicationClusters, setReplicationClusters] = useState<string[]>([]);
  const [numBundles, setNumBundles] = useState<number>(4);
  const navigate = useNavigate();

  const { data: allClusters, error: allClustersError } = useSWR(
    swrKeys.pulsar.clusters._(),
    async () => {
      const res = await clusterServiceClient.listClusters(new ListClustersRequest(), null);

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get clusters list. ${res.getStatus()?.getMessage()}`);
        return [];
      }

      return res.getClustersList();
    }
  );

  if (allClustersError) {
    notifyError(`Unable to get clusters list. ${allClustersError}`)
  }

  useEffect(() => {
    // Pick first cluster by default
    if (replicationClusters.length === 0 && allClusters && allClusters?.length > 0) {
      setReplicationClusters([allClusters[0]]);
    }
  }, [allClusters]);

  const createNamespace = async () => {
    const req = new CreateNamespaceRequest();
    req.setNamespaceName(`${props.tenant}/${namespaceName}`);
    req.setReplicationClustersList(replicationClusters);
    req.setNumBundles(numBundles);

    const res = await namespaceServiceClient.createNamespace(req, null).catch(err => { `Unable to create namespace: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create namespace: ${res.getStatus()?.getMessage()}`);
      return;
    }

    mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }));
    mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());

    navigate(routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }));
  }

  const namespaceNameInput = <Input value={namespaceName} onChange={setNamespaceName} placeholder="namespace-1" />;

  const replicationClustersInput = <ListInput<string>
    value={replicationClusters.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) || []}
    getId={(v) => v}
    renderItem={(v) => <div>{v}</div>}
    editor={allClusters?.every(ac => replicationClusters.includes(ac)) ? undefined : {
      render: (v, onChange) => (
        <SelectInput<string>
          list={[
            { type: 'empty', title: '' },
            ...(allClusters?.filter(c => !replicationClusters.includes(c)) || []).map<ListItem<string>>(c => ({ type: 'item', value: c, title: c }))
          ]}
          value={v}
          onChange={onChange}
          placeholder="Select cluster"
        />
      ),
      initialValue: '',
    }}
    onRemove={(v) => setReplicationClusters(replicationClusters.filter(c => c !== v))}
    onAdd={(v) => setReplicationClusters([...replicationClusters, v])}
    validate={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Replication clusters cannot be empty'))}
  />

  const numBundlesInput = <Input type="number" value={numBundles.toString()} onChange={(v) => setNumBundles(parseInt(v))} placeholder="4" />;

  const isFormValid = namespaceName.length > 0 && replicationClusters.length > 0;

  return (
    <form className={s.CreateNamespace} onSubmit={e => e.preventDefault()}>
      <div className={s.Title}>
        <H1>Create Namespace</H1>
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "namespaceName",
            title: "Namespace name",
            description: <span></span>,
            input: namespaceNameInput,
            isRequired: true,
          },
          {
            id: "replicationClusters",
            title: "Replication clusters",
            description: <span>List of clusters this namespace will be assigned.</span>,
            input: replicationClustersInput,
          },
          {
            id: "numBundles",
            title: "Bundles count",
            description: <span>Number of bundles to activate.</span>,
            input: numBundlesInput,
          }
        ]}
      />
      <Button
        onClick={createNamespace}
        type='primary'
        text='Create'
        disabled={!isFormValid}
        buttonProps={{
          type: 'submit'
        }}
      />
    </form>
  );
}

export default CreateNamespace;
