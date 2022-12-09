import React, { useState } from 'react';
import useSWR, { useSWRConfig } from "swr";

import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import Checkbox from '../../ui/Checkbox/Checkbox';
import Button from '../../ui/Button/Button';
import Input from '../../ui/Input/Input';
import { swrKeys } from '../../swrKeys';
import { mapToObject } from '../../../pbUtils/pbUtils';

import s from './Permissions.module.css';

export const actionsList = ['produce', 'consume', 'functions', 'sources', 'sinks', 'packages'];
export type AuthAction = typeof actionsList[number];

function authActionFromPb(authAction: pb.AuthAction): AuthAction {
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

function authActionToPb(authAction: AuthAction): pb.AuthAction {
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

type PermissionsProps = {
  tenant: string;
  namespace: string;
}

type Permission = {
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
  const [permissionsList, setPermissionsList] = useState<Permission[]>()

  const defaultPermission: Permission = {
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

  const { data: permissions, error: authActionsError } = useSWR(
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

      const permissionsObject = mapToObject(res.getPermissionsMap())
      const authActions = Object.keys(permissionsObject).map(role => {
        let permissionsItem = { role: defaultPermission.role, actions: { ...defaultPermission.actions } };

        permissionsItem.role = role
        permissionsObject[role].getAuthActionsList().map((action) =>
          permissionsItem.actions[authActionFromPb(action)] = true
        )

        return permissionsItem
      })

      setFormValue({ role: defaultPermission.role, actions: {...defaultPermission.actions} })
      setPermissionsList(authActions?.sort((a, b) => a.role.localeCompare(b.role, 'en', { numeric: true })))
      return authActions;
    }
  );
  
  const revoke = async (role: string) => {
    const req = new pb.RevokePermissionsRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);
    req.setRole(role);

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
    req.setRole(permission.role);
    req.setAuthActionsList(actions);

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
            </tr>
          </thead>
          <tbody>
            {permissions && permissionsList?.map((permission, index) => (
              <tr key={permission.role} className={s.Row}>
                <td className={`${s.Cell} ${s.DynamicConfigCell}`}>
                  {permission.role}
                </td>
                {actionsList.map(action => (
                  <td key={action} className={`${s.Cell} ${s.DynamicConfigCell}`}>
                    <div className={`${s.ButtonBlock}`}>
                      <Checkbox
                        value={permission.actions[action]}
                        onChange={(value) => {
                          setPermissionsList(Object.assign(
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
                  <div className={`${s.ButtonsCase}`}>
                    <Button
                      onClick={() => grant(permission)}
                      type='primary'
                      text='update'
                      disabled={JSON.stringify(permissions[index].actions) === JSON.stringify(permission.actions)}
                      buttonProps={{ type: 'submit' }}
                    />
                    <Button
                      onClick={() => revoke(permission.role)}
                      type='danger'
                      text='Revoke'
                      buttonProps={{ type: 'submit' }}
                    />
                  </div>
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
                  <div className={ permissionsList?.length && s.CompressionBlock || s.ButtonBlock }>
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