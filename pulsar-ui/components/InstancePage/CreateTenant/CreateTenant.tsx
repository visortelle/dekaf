import React, { useEffect, useState } from 'react';
import s from './CreateTenant.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import ListInput from '../../ui/ConfigurationTable/ListInput/ListInput';
import SelectInput, { ListItem } from '../../ui/ConfigurationTable/SelectInput/SelectInput';
import Input from '../../ui/Input/Input';
import Button from '../../ui/Button/Button';
import { CreateTenantRequest, TenantInfo } from '../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import useSWR, { mutate } from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListClustersRequest } from '../../../grpc-web/tools/teal/pulsar/ui/cluster/v1/cluster_pb';
import * as Either from 'fp-ts/Either';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import { H1 } from '../../ui/H/H';
import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';

export type CreateTenantProps = {};

const CreateTenant: React.FC<CreateTenantProps> = () => {
  const { notifyError } = Notifications.useContext();
  const { tenantServiceClient, clusterServiceClient } = PulsarGrpcClient.useContext();
  const [tenantName, setTenantName] = useState('');
  const [allowedClusters, setAllowedClusters] = useState<string[]>([]);
  const [adminRoles, setAdminRoles] = useState<string[]>([]);
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
    if (allowedClusters.length === 0 && allClusters && allClusters?.length > 0) {
      setAllowedClusters([allClusters[0]]);
    }
  }, [allClusters]);

  const createTenant = async () => {
    const req = new CreateTenantRequest();
    const tenantInfo = new TenantInfo();
    tenantInfo.setAllowedClustersList(allowedClusters);
    tenantInfo.setAdminRolesList(adminRoles);
    req.setTenantName(tenantName);
    req.setTenantInfo(tenantInfo);

    const res = await tenantServiceClient.createTenant(req, null).catch(err => { `Unable to create tenant: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create tenant: ${res.getStatus()?.getMessage()}`);
      return;
    }

    mutate(swrKeys.pulsar.tenants._());
    mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());

    navigate(routes.instance.tenants._.get());
  }

  const tenantNameInput = <Input value={tenantName} onChange={setTenantName} placeholder="tenant-1" />;

  const allowedClustersInput = <ListInput<string>
    value={allowedClusters.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) || []}
    getId={(v) => v}
    renderItem={(v) => <div>{v}</div>}
    editor={allClusters?.every(ac => allowedClusters.includes(ac)) ? undefined : {
      render: (v, onChange) => (
        <SelectInput<string>
          list={[
            { type: 'empty', title: '' },
            ...(allClusters?.filter(c => !allowedClusters.includes(c)) || []).map<ListItem<string>>(c => ({ type: 'item', value: c, title: c }))
          ]}
          value={v}
          onChange={onChange}
          placeholder="Select cluster"
        />),
      initialValue: '',
    }}
    onRemove={(v) => setAllowedClusters(allowedClusters.filter(c => c !== v))}
    onAdd={(v) => setAllowedClusters([...allowedClusters, v])}
    isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty'))}
  />

  const adminRolesInput = <ListInput<string>
    value={adminRoles.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) || []}
    getId={(v) => v}
    renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
    editor={{
      render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="tenant-1-admin" />,
      initialValue: '',
    }}
    onRemove={(v) => setAdminRoles(adminRoles.filter(r => r !== v))}
    onAdd={(v) => setAdminRoles([...adminRoles, v])}
    isValid={() => Either.right(undefined)}
  />

  const isFormValid = tenantName.length > 0 && allowedClusters.length > 0;

  return (
    <form className={s.CreateTenant} onSubmit={e => e.preventDefault()}>
      <div className={s.Title}>
        <H1>Create tenant</H1>
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "tenantName",
            title: "Tenant name",
            description: <span></span>,
            input: tenantNameInput,
            isRequired: true,
          },
          {
            id: "allowedClusters",
            title: "Allowed clusters",
            description: <span>List of clusters that this tenant is restricted on.</span>,
            input: allowedClustersInput,
            isRequired: true,
          },
          {
            id: "adminRoles",
            title: "Admin roles",
            description: <span>List of authenticated roles allowed to manage this tenant.</span>,
            input: adminRolesInput,
          }
        ]}
      />
      <Button
        onClick={createTenant}
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

export default CreateTenant;
