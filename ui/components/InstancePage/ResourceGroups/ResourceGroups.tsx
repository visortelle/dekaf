import React from 'react';
import useSWR from 'swr';

import ResourceGroupForm, { View as FormView } from './ResourceGroupForm/ResourceGroupForm';
import { routes } from '../../routes';
import { swrKeys } from '../../swrKeys';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { GetResourceGroupsRequest } from '../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import Button from '../../ui/Button/Button';

import s from './ResourceGroups.module.css';
import sc from '../Configuration/Configuration.module.css';
import { H1 } from '../../ui/H/H';
import ActionButton from '../../ui/ActionButton/ActionButton';
import { useNavigate } from 'react-router';
import { ToolbarButton } from '../../ui/Toolbar/Toolbar';

type View = FormView | { type: 'show-all-groups' };

type Props = {
  view: View;
}

const ResourceGroups: React.FC<Props> = (props) => {
  const { brokersServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const navigate = useNavigate();

  const { data: groups, error: groupsError } = useSWR(
    swrKeys.pulsar.brokers.resourceGroups._(),
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
  if (groupsError) {
    notifyError(`Unable to get resource groups list. ${groupsError}`);
  }

  let groupsToRender = groups;
  groupsToRender = groupsToRender?.sort((a, b) => a.getName().localeCompare(b.getName(), 'en', { numeric: true }));

  return (
    <div className={s.ResourceGroups}>
      {props.view.type === 'create' && <ResourceGroupForm view={props.view} />}
      {props.view.type === 'edit' && <ResourceGroupForm view={props.view} />}
      {props.view.type === 'show-all-groups' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <H1>Resource groups</H1>
            <div style={{ marginBottom: '12rem' }}>
              <ToolbarButton
                text={'Create'}
                onClick={() => undefined}
                linkTo={routes.instance.resourceGroups.create._.get()}
                type="primary"
              />
            </div>
          </div>
          <div className={sc.ConfigurationTable}>
            <table className={sc.Table}>
              <thead>
                <tr className={sc.Row}>
                  <th className={sc.Cell} style={{ minWidth: '20ch' }}>Name</th>
                  <th className={sc.Cell}>Publish rate in bytes</th>
                  <th className={sc.Cell}>Publish rate in msgs.</th>
                  <th className={sc.Cell}>Dispatch rate in bytes</th>
                  <th className={sc.Cell}>Dispatch rate in msgs.</th>
                  <th className={sc.Cell}></th>
                </tr>
              </thead>

              <tbody>
                {groupsToRender && groupsToRender.map((rg) => (
                  <tr key={rg.getName()} className={sc.Row}>
                    <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                      {rg.getName()}
                    </td>
                    <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                      {rg.getDispatchRateInBytes()?.getValue()}
                    </td>
                    <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                      {rg.getDispatchRateInMsgs()?.getValue()}
                    </td>
                    <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                      {rg.getPublishRateInBytes()?.getValue()}
                    </td>
                    <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                      {rg.getPublishRateInMsgs()?.getValue()}
                    </td>
                    <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                      <ActionButton
                        action={{ type: 'predefined', action: 'edit' }}
                        linkTo={routes.instance.resourceGroups.edit._.get({ groupName: rg.getName() })}
                        onClick={() => undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
};

export default ResourceGroups;
