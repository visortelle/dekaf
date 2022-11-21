import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useNavigate } from 'react-router-dom';

import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { CreateResourceGroupRequest, ResourceGroup } from '../../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { H1 } from '../../../../ui/H/H';
import ConfigurationTable from '../../../../ui/ConfigurationTable/ConfigurationTable';
import Button from '../../../../ui/Button/Button';
import Input from '../../../../ui/Input/Input';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { swrKeys } from '../../../../swrKeys';
import { routes } from '../../../../routes';

import s from '../../../CreateTenant/CreateTenant.module.css'

const ResourceGroupCreating = () => {
  const req = new CreateResourceGroupRequest();
  const resourceGroup = new ResourceGroup();
  const navigate = useNavigate();
  const { notifyError } = Notifications.useContext();
  const { brokersServiceClient } = PulsarGrpcClient.useContext();

  const [resourceGroupName, setResourceGroupName] = useState('');
  const [dispatchRateInBytes, setDispatchRateInBytes] = useState('0');
  const [dispatchRateInMsgs, setDispatchRateInMsgs] = useState('0');
  const [publishRateInBytes, setPublishRateInBytes] = useState('0');
  const [publishRateInMsgs, setPublishRateInMsgs] = useState('0');

  const isFormValid = resourceGroupName.length > 0 
                      //&& allowedClusters.length > 0 &&

  const createResourceGroup = async () => {

    resourceGroup.setName(resourceGroupName)
    resourceGroup.setDispatchRateInBytes(+dispatchRateInBytes)
    resourceGroup.setDispatchRateInMsgs(+dispatchRateInMsgs)
    resourceGroup.setPublishRateInBytes(+publishRateInBytes)
    resourceGroup.setPublishRateInMsgs(+publishRateInMsgs)

    req.setResourceGroup(resourceGroup)
    
    const res = await brokersServiceClient.createResourceGroup(req, null).catch(err => { `Unable to create tenant: ${err}` });
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create tenant: ${res.getStatus()?.getMessage()}`);
      return;
    }

    await mutate(swrKeys.pulsar.brokers.availableResourceGroups._());

    navigate(routes.instance.configuration.resourceGroups._.get());
  }

  const resourceGroupNameInput = <Input value={resourceGroupName} onChange={setResourceGroupName} placeholder="tenant-1" />;
  const dispatchRateInBytesInput = <Input type="number" value={dispatchRateInBytes} onChange={setDispatchRateInBytes} placeholder="tenant-1" />;
  const dispatchRateInMsgsInput = <Input type="number" value={dispatchRateInMsgs} onChange={setDispatchRateInMsgs} placeholder="tenant-1" />;
  const publishRateInBytesInput = <Input type="number" value={publishRateInBytes} onChange={setPublishRateInBytes} placeholder="tenant-1" />;
  const publishRateInMsgsInput = <Input type="number" value={publishRateInMsgs} onChange={setPublishRateInMsgs} placeholder="tenant-1" />;

  return (
    <form className={s.CreateTenant} onSubmit={e => e.preventDefault()}>
      <div className={s.Title}>
        <H1>Create tenant</H1>
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "resourceGroupName",
            title: "Resource group name",
            description: <span></span>,
            input: resourceGroupNameInput,
            isRequired: true,
          },
          {
            id: "dispatchRateInBytes",
            title: "Dispatch rate in bytes",
            description: <span>List of clusters that this tenant is restricted on.</span>,
            input: dispatchRateInBytesInput,
            isRequired: true,
          },
          {
            id: "dispatchRateInMsgs",
            title: "Dispatch rate in msgs",
            description: <span>List of authenticated roles allowed to manage this tenant.</span>,
            input: dispatchRateInMsgsInput,
            isRequired: true,
          },
          {
            id: "publishRateInBytes",
            title: "Publish rate in bytes",
            description: <span>List of authenticated roles allowed to manage this tenant.</span>,
            input: publishRateInBytesInput,
            isRequired: true,
          },
          {
            id: "publishRateInMsgs",
            title: "Publish rate in msgs",
            description: <span>List of authenticated roles allowed to manage this tenant.</span>,
            input: publishRateInMsgsInput,
            isRequired: true,
          },
        ]}
      />
      <Button
        onClick={createResourceGroup}
        type='primary'
        text='Create'
        disabled={!isFormValid}
        buttonProps={{
          type: 'submit'
        }}
      />
    </form>
  )
};

export default ResourceGroupCreating;


// const CreateTenant: React.FC<CreateTenantProps> = () => {
  
//   const { data: allClusters, error: allClustersError } = useSWR(
//     swrKeys.pulsar.clusters._(),
//     async () => {
//       const res = await clusterServiceClient.listClusters(new ListClustersRequest(), null);

//       if (res.getStatus()?.getCode() !== Code.OK) {
//         notifyError(`Unable to get clusters list. ${res.getStatus()?.getMessage()}`);
//         return [];
//       }

//       return res.getClustersList();
//     }
//   );

//   if (allClustersError) {
//     notifyError(`Unable to get clusters list. ${allClustersError}`)
//   }

//   useEffect(() => {
//     // Pick first cluster by default
//     if (allowedClusters.length === 0 && allClusters && allClusters?.length > 0) {
//       setAllowedClusters([allClusters[0]]);
//     }
//   }, [allClusters]);

//   const allowedClustersInput = <ListInput<string>
//     value={allowedClusters.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) || []}
//     getId={(v) => v}
//     renderItem={(v) => <div>{v}</div>}
//     editor={allClusters?.every(ac => allowedClusters.includes(ac)) ? undefined : {
//       render: (v, onChange) => (
//         <SelectInput<string>
//           list={[
//             { type: 'empty', title: '' },
//             ...(allClusters?.filter(c => !allowedClusters.includes(c)) || []).map<ListItem<string>>(c => ({ type: 'item', value: c, title: c }))
//           ]}
//           value={v}
//           onChange={onChange}
//           placeholder="Select cluster"
//         />),
//       initialValue: '',
//     }}
//     onRemove={(v) => setAllowedClusters(allowedClusters.filter(c => c !== v))}
//     onAdd={(v) => setAllowedClusters([...allowedClusters, v])}
//     validate={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty'))}
//   />

//   const adminRolesInput = <ListInput<string>
//     value={adminRoles.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) || []}
//     getId={(v) => v}
//     renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
//     editor={{
//       render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="tenant-1-admin" />,
//       initialValue: '',
//     }}
//     onRemove={(v) => setAdminRoles(adminRoles.filter(r => r !== v))}
//     onAdd={(v) => setAdminRoles([...adminRoles, v])}
//     validate={() => Either.right(undefined)}
//   />
// }

// import ListInput from '../../ui/ConfigurationTable/ListInput/ListInput';
// import SelectInput, { ListItem } from '../../ui/ConfigurationTable/SelectInput/SelectInput';

// import { ListClustersRequest } from '../../../grpc-web/tools/teal/pulsar/ui/cluster/v1/cluster_pb';
// import * as Either from 'fp-ts/Either';
