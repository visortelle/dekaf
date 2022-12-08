import React, { useState } from 'react';
import useSWR, { useSWRConfig } from "swr";

import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../swrKeys';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import Checkbox from '../../ui/Checkbox/Checkbox';
import Button from '../../ui/Button/Button';
import Input from '../../ui/Input/Input';

import s from './Permissions.module.css';
import { mapToObject } from '../../../pbUtils/pbUtils';

export const actionsList = ['produce', 'consume', 'functions', 'sources', 'sinks', 'packages'];
export type AuthActionList = typeof actionsList[number];

function authActionFromPb(authAction: pb.AuthAction): AuthActionList {
  switch (authAction) {
    case pb.AuthAction.AUTH_ACTION_PRODUCE:
      return 'produce';
    case pb.AuthAction.AUTH_ACTION_CONSUME:
      return 'consume';
    case pb.AuthAction.AUTH_ACTION_FUNCTIONS:
      return 'functions';
    case pb.AuthAction.AUTH_ACTION_SOURCES:
      return 'sources';
    case pb.AuthAction.AUTH_ACTION_SINKS:
      return 'sinks';
    case pb.AuthAction.AUTH_ACTION_PACKAGES:
      return 'packages';
    default:
      throw new Error(`Unknown auth action: ${authAction}`);
  }
}

function authActionToPb(authAction: AuthActionList): pb.AuthAction {
  switch (authAction) {
    case 'produce':
      return pb.AuthAction.AUTH_ACTION_PRODUCE;
    case 'consume':
      return pb.AuthAction.AUTH_ACTION_CONSUME;
    case 'functions':
      return pb.AuthAction.AUTH_ACTION_FUNCTIONS;
    case 'sources':
      return pb.AuthAction.AUTH_ACTION_SOURCES;
    case 'sinks':
      return pb.AuthAction.AUTH_ACTION_SINKS;
    case 'packages':
      return pb.AuthAction.AUTH_ACTION_PACKAGES;
    default:
      throw new Error(`Unknown auth action: ${authAction}`);
  }
}

interface PermissionsProps {
  tenant: string;
  namespace: string;
}

interface Permission {
  role: string;
  actions: {
    [action: string]: boolean;
    produce: boolean;
    consume: boolean;
    functions: boolean;
    sources: boolean;
    sinks: boolean;
    packages: boolean;
  }
}

const Permissions = (props: PermissionsProps) => {

  const { notifyError } = Notifications.useContext();
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { mutate } = useSWRConfig();
  const [formValue, setFormValue] = useState<Permission | undefined>(undefined);
  const [permissionsList, setAuthActionsList] = useState<Permission[]>()

  const defaultAuthAction: Permission = {
    role: '',
    actions: {
      produce: false,
      consume: false,
      functions: false,
      sources: false,
      sinks: false,
      packages: false
    }
  }

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.permissions._({ tenant: props.tenant, namespace: props.namespace });

  const { data: authActions, error: authActionsError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPermissionsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getPermissions(req, {});
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      const authActionsObject = mapToObject(res.getAuthActionsMap())
      const authActions = Object.keys(authActionsObject).map(role => {
        let authActionItem = { role: defaultAuthAction.role, actions: { ...defaultAuthAction.actions } };

        authActionItem.role = role
        authActionsObject[role].getAuthActionsList().map((action) =>
          authActionItem.actions[authActionFromPb(action)] = true
        )

        return authActionItem
      })

      setFormValue({ role: defaultAuthAction.role, actions: {...defaultAuthAction.actions} })
      setAuthActionsList(authActions?.sort((a, b) => a.role.localeCompare(b.role, 'en', { numeric: true })))
      return authActions;
    }
  );
  
  const remove = async (role: string) => {
    const req = new pb.RevokePermissionsRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);
    req.setRole(role)

    const res = await namespaceServiceClient.revokePermissions(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(res.getStatus()?.getMessage());
      return;
    }

    await mutate(swrKey);
  }

  const grant = async (permission: Permission) => {

    let actions: pb.AuthAction[] = [];
    for (let key in permission.actions) {
      if (permission.actions[key] === true) {
        actions.push(authActionToPb(key))
      }
    }

    const req = new pb.GrantPermissionsRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);
    req.setRole(permission.role)
    req.setPermissionsList(actions)

    const res = await namespaceServiceClient.grantPermissions (req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(res.getStatus()?.getMessage());
      return;
    }

    await mutate(swrKey);
  }

  if (authActionsError) {
    notifyError(`Unable to get permissions. ${authActionsError}`);
  };

  return (
    <div>
      <div className={s.ConfigurationTable}>
        <table className={s.Table}>
          <thead>
            <tr className={s.Row}>
              <th className={s.Cell} style={{ minWidth: '10ch' }}>Role</th>
              <th className={s.Cell}>Produce</th>
              <th className={s.Cell}>Consume</th>
              <th className={s.Cell}>Functions</th>
              <th className={s.Cell}>Sources</th>
              <th className={s.Cell}>Sinks</th>
              <th className={s.Cell}>Packages</th>
              <th className={s.Cell} />
              <th className={s.Cell} />
            </tr>
          </thead>
          <tbody>
            {authActions && permissionsList?.map((permission, index) => (
              <tr key={permission.role} className={s.Row}>
                <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                  {permission.role}
                </td>
                {actionsList.map(action => (
                  <td key={action} className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    <div className={`${s.ButtonBlock}`}>
                      <Checkbox
                        size='big'
                        value={permission.actions[action]}
                        onChange={(value) => {
                          setAuthActionsList(Object.assign(
                            [...permissionsList],
                            { 
                              [index]: {
                                ...permission,
                                actions: {
                                  ...permission.actions,
                                  [action]: value
                                }
                              }
                            }
                          ))
                        }}
                      />
                    </div>
                  </td>
                ))}
                <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                  <Button
                    onClick={() => grant(permission)}
                    type='primary'
                    text='update'
                    disabled={JSON.stringify(authActions[index].actions) === JSON.stringify(permission.actions)}
                    buttonProps={{ type: 'submit' }}
                  />
                </td>
                <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                  <Button
                    onClick={() => grant(permission)}
                    type='danger'
                    text='Revoke'
                    buttonProps={{ type: 'submit' }}
                  />
                </td>
              </tr>
            ))}

            {formValue &&
              <tr className={s.Row}>
                <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                  <Input
                    type="string"
                    value={formValue.role || ''}
                    onChange={(v) => setFormValue({ ...formValue, role: v})}
                    placeholder="New role"
                  />
                </td>
                {actionsList.map(action => (
                  <td key={action} className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    <div className={`${s.ButtonBlock}`}>
                      <Checkbox
                        size='big'
                        value={formValue.actions[action]}
                        onChange={(value) => {
                          setFormValue({
                            ...formValue,
                            actions: {...formValue.actions, [action]: value}
                          })
                        }}
                      />
                    </div>
                  </td>
                ))}
                <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                  <div className={`${s.ButtonBlock}`}>
                    <Button
                      onClick={() => grant(formValue)}
                      type='primary'
                      text='Grant'
                      buttonProps={{ type: 'submit' }}
                      disabled={formValue.role.length < 1}
                    />
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Permissions;