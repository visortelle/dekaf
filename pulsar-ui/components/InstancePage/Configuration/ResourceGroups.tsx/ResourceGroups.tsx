import React, { useState } from 'react';
import useSWR from 'swr';
import { useQueryParam, withDefault, StringParam, BooleanParam } from 'use-query-params';

import ResourceGroup from './ResourceGroup/ResourceGroup';
import { swrKeys } from '../../../swrKeys';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { GetResourceGroupsRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import Input from '../../../ui/Input/Input';
import SmallButton from '../../../ui/SmallButton/SmallButton';
import Button from '../../../ui/Button/Button';

import s from './../Configuration.module.css';

const ResourceGroups = () => {

  const { brokersServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [paramFilter, setParamFilter] = useQueryParam('paramFilter', withDefault(StringParam, ''));
  const [createGroup, setCreateGroup] = useQueryParam('createGroup', withDefault(BooleanParam, false));
  const [updateGroup, setUpdateGroup] = useState(-1);

  const { data: availableResourceGroups, error: availableResourceGroupsError } = useSWR(
    swrKeys.pulsar.brokers.availableResourceGroups._(),
    async () => {
      const req = new GetResourceGroupsRequest();
      const res = await brokersServiceClient.getResourceGroups(req, {}).catch(err => notifyError(`Unable to get available dynamic configuration keys: ${err}`));
      if (res === undefined) {
        return [];
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get available dynamic configuration keys: ${res.getStatus()?.getMessage()}`);
        return [];
      }
      return res.getResourceGroupsList();
    }
  );
  if (availableResourceGroupsError) {
    notifyError(`Unable to get dynamic configuration parameters list. ${availableResourceGroupsError}`);
  }
  let allGroups = availableResourceGroups;
  
  if (paramFilter !== '') {
    allGroups = allGroups?.filter(key => key.getName().toLowerCase().includes(paramFilter.toLowerCase()));
  }

  const groupsSorter = () => {
    allGroups = allGroups?.sort((a, b) => a.getName() < b.getName() ? 1 : -1)
    console.log(allGroups)
  }

  return (
    <div>
      <div className={s.Toolbar}>
        <div style={{ width: '480rem' }}>
          <Input value={paramFilter} onChange={v => setParamFilter(v)} placeholder="name filter" focusOnMount={true} clearable={true} />
        </div>
        {/* TODO delete style and in configuration */}
        <div style={{ marginLeft: 'auto', marginTop: 'auto' }}>
          <SmallButton
            text={createGroup ? 'Show resource groups' : 'Create resource group'}
            onClick={() => (setUpdateGroup(-1) , setCreateGroup(!createGroup))}
            type="primary"
          />
        </div>
      </div>
      {createGroup && <ResourceGroup key={updateGroup} resourceGroupSettings={allGroups && allGroups[updateGroup]} /> ||
        <div className={s.ConfigurationTable}>
          <table className={s.Table}>
            <thead>
              <tr className={s.Row}>
                <th className={s.Cell} onClick={() => groupsSorter()}>Group name</th>
                <th className={s.Cell}>Publish rate in bytes</th>
                <th className={s.Cell}>Publish rate in msgs</th>
                <th className={s.Cell}>Dispatch rate in bytes</th>
                <th className={s.Cell}>Dispatch rate in msgs</th>
                <th className={s.Cell} />
              </tr>
            </thead>
            <tbody>
              {allGroups && allGroups.map((key, index) => (
                <tr key={key.getName()} className={s.Row}>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {key.getName()}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {key.getDispatchRateInBytes()}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {key.getDispatchRateInMsgs()}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {key.getPublishRateInBytes()}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {key.getPublishRateInMsgs()}
                  </td>
                  <td>
                    <Button
                      onClick={() => (setUpdateGroup(index), setCreateGroup(!createGroup))}
                      type='primary'
                      text='change'
                      buttonProps={{
                        type: 'submit'
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  )
};

export default ResourceGroups;