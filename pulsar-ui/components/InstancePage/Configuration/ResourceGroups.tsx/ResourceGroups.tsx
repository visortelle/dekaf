import React, { useEffect, useRef } from 'react';
import Highlighter from "react-highlight-words";
import ReactDOMServer from 'react-dom/server';
import useSWR, { mutate } from 'swr';
import { useQueryParam, withDefault, StringParam, BooleanParam } from 'use-query-params';

import { DynamicConfigValue } from '../Configuration';
import ResourceGroupCreating from './ResourceGroupCreating/ResourceGroupCreating';
import { help } from '../help';
import { swrKeys } from '../../../swrKeys';
import * as BrokerConfig from '../../../app/contexts/BrokersConfig';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { 
  GetResourceGroupsRequest,
  CreateResourceGroupRequest,
  UpdateResourceGroupRequest,
  DeleteResourceGroupRequest,
} from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import Input from '../../../ui/Input/Input';
import SmallButton from '../../../ui/SmallButton/SmallButton';

import s from './../Configuration.module.css';

const ResourceGroups = () => {

  const { brokersServiceClient } = PulsarGrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [paramFilter, setParamFilter] = useQueryParam('paramFilter', withDefault(StringParam, ''));
  const [createGroup, setCreateGroup] = useQueryParam('createGroup', withDefault(BooleanParam, false));

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
  // let allGroups = availableResourceGroups && availableResourceGroups[0] ? [...Object.keys(availableResourceGroups[0])] : [];
  // let allKeys = Array.from(new Set([...Object.keys(dynamicConfig), ...Object.keys(runtimeConfig)])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  // if (paramFilter !== '') {
  //   allGroups = allGroups.filter(key => key.toLowerCase().includes(paramFilter.toLowerCase()));
  // }

  const deleteResourceGroup = async (name: string) => {
    const req = new DeleteResourceGroupRequest();
    req.setName(name);
    const res = await brokersServiceClient.deleteResourceGroup(req, {}).catch(err => notifyError(`Unable to delete resource group value: ${err}`));
    if (res === undefined) {
      return;
    }
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete resource group: ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(`Resource group ${name} has been successfully deleted.`);
    // setIsShowEditor(false);

    await mutate(swrKeys.pulsar.brokers.availableResourceGroups._());
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
            onClick={() => setCreateGroup(!createGroup)}
            type="primary"
          />
        </div>
      </div>
      {createGroup && <ResourceGroupCreating /> ||
        <div className={s.ConfigurationTable}>
          <table className={s.Table}>
            <thead>
              <tr className={s.Row}>
                <th className={s.Cell}>Group name</th>
                <th className={s.Cell}>Publish rate in msgs</th>
                <th className={s.Cell}>Publish rate in bytes</th>
                <th className={s.Cell}>Dispatch rate in msgs</th>
                <th className={s.Cell}>Dispatch rate in bytes</th>
              </tr>
            </thead>
            <tbody>
              {allGroups && allGroups.map((key) => (
                <tr key={key.getName()} className={s.Row}>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {availableResourceGroups?.includes(key) ? (
                      <DynamicConfigValue configKey={key.getName()} configValue={key.getName()} />
                    ) : <span>-</span>}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {availableResourceGroups?.includes(key) ? (
                      <DynamicConfigValue configKey={key.getDispatchRateInMsgs().toString()} configValue={key.getDispatchRateInMsgs().toString()} />
                    ) : <span>-</span>}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {availableResourceGroups?.includes(key) ? (
                      <DynamicConfigValue configKey={key.getDispatchRateInBytes().toString()} configValue={key.getDispatchRateInBytes().toString()} />
                    ) : <span>-</span>}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {availableResourceGroups?.includes(key) ? (
                      <DynamicConfigValue configKey={key.getPublishRateInMsgs.toString()} configValue={key.getPublishRateInMsgs().toString()} />
                    ) : <span>-</span>}
                  </td>
                  <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    {availableResourceGroups?.includes(key) ? (
                      <DynamicConfigValue configKey={key.getPublishRateInBytes().toString()} configValue={key.getPublishRateInBytes().toString()} />
                    ) : <span>-</span>}
                  </td>
                  <td onClick={() => deleteResourceGroup(key.getName())}>
                    delete
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