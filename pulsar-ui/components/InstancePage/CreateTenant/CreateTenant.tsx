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

export type CreateTenantProps = {};

const CreateTenant: React.FC<CreateTenantProps> = (props) => {
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
    }

    mutate(swrKeys.pulsar.tenants._());
    navigate(routes.tenants.tenant.namespaces._.get({ tenant: tenantName }));
  }

  const isFormValid = tenantName.length > 0 && allowedClusters.length > 0;

  const adminRolesInput = <ListInput<string>
    value={adminRoles.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) || []}
    getId={(v) => v}
    renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
    editor={{
      render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="Enter new role" />,
      initialValue: '',
    }}
    onRemove={(v) => setAdminRoles(adminRoles.filter(r => r !== v))}
    onAdd={(v) => setAdminRoles([...adminRoles, v])}
    isValid={() => Either.right(undefined)}
  />

  return (
    <div className={s.CreateTenant} >
      <H1>Create tenant</H1>
      <Input value={tenantName} onChange={setTenantName} />
      <ListInput<string>
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
              onChange={(v) => onChange(v as string)}
              placeholder="Select cluster"
            />),
          initialValue: '',
        }}
        onRemove={(v) => setAllowedClusters(allowedClusters.filter(c => c !== v))}
        onAdd={(v) => setAllowedClusters([...allowedClusters, v])}
        isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty'))}
      />
      {adminRolesInput}
      <Button
        onClick={createTenant}
        type='primary'
        text='Create'
        disabled={!isFormValid}
      />
    </div >
  );
}

export default CreateTenant;
