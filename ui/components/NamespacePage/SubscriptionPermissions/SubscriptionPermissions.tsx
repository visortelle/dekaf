import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import _ from 'lodash';
import CreatableSelect from 'react-select/creatable';

import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import Input from '../../ui/Input/Input';
import { H1, H3 } from '../../ui/H/H';
import { swrKeys } from '../../swrKeys';
import { mapToObject } from '../../../pbUtils/pbUtils';

import s from './SubscriptionPermissions.module.css';
import Button from '../../ui/Button/Button';

export const actionsList = ['produce', 'consume', 'functions', 'sources', 'sinks', 'packages'];
export type AuthAction = typeof actionsList[number];

type PermissionsProps = {
  tenant: string;
  namespace: string;
}

type Permission = {
  subscription: string;
  roles: string[];
}

type NewPermission = Permission & {
  inputValue: string
}

type Option = {
  label: string;
  value: string;
}

const SubscriptionPermissions: React.FC<PermissionsProps> = (props) => {
  const { notifySuccess, notifyError } = Notifications.useContext();
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { mutate } = useSWRConfig();
  
  const [permissionsList, setPermissionsList] = useState<Permission[]>();
  const [option, setOption] = useState<readonly Option[]>([])
  const [inputsValue, setInputsValue] = useState<string[]>(['']);

  const defaultPermission = {
    subscription: '',
    roles: [],
    inputValue: '',
  }

  const [newPermission, setNewPermission] = useState<NewPermission>(defaultPermission)
  
  const createOption = (label: string) => ({
    label,
    value: label,
  });

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.subscriptionPermissions._({ tenant: props.tenant, namespace: props.namespace });

  const { data: permissions, error: authActionsError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPermissionOnSubscriptionRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getPermissionOnSubscription(req, {});

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }
      
      const permissionsObject = mapToObject(res.getPermissionsMap())
      const permissions = Object.keys(permissionsObject).map((subscription) => {

        setInputsValue([...inputsValue, ''])

        const permission = {
          subscription: subscription,
          roles: permissionsObject[subscription].toArray()[0],
        }

        return permission;
      })

      const roles = permissions.map(permission => {
        return permission.roles
      })
      const options = new Set([ ...res.getRolesList(), ...[].concat(...roles) ])

      setOption(Array.from(options).map(createOption))
      setPermissionsList(permissions?.sort((a, b) => a.subscription.localeCompare(b.subscription, 'en', { numeric: true })))

      return permissions;
    },
    {
      dedupingInterval: 0 // Fix empty data on fast route change
    }
  );

  const reset = (index: number) => {
    if (permissionsList && permissions){
      setPermissionsList(
        Object.assign(
          [...permissionsList],
          { [index]: permissions[index] }
        )
      )
    }
  }

  const revoke = async (index: number) => {
    if (!permissionsList) {
      return;
    }

    const req = new pb.RevokePermissionOnSubscriptionRequest();

    req.setNamespace(`${props.tenant}/${props.namespace}`);
    req.setSubscription(permissionsList[index].subscription);

    const res = await namespaceServiceClient.revokePermissionOnSubscription(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(res.getStatus()?.getMessage());
      return;
    }

    notifySuccess(
      <span>Successfully revoked permissions for subscription: <strong>{permissionsList[index].subscription}</strong></span>,
      `permission-revoked-${permissionsList[index].subscription}`
    );

    await mutate(swrKey);
  }

  const grant = async (permission: Permission) => {

    const req = new pb.GrantPermissionOnSubscriptionRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);
    req.setSubscription(permission.subscription);
    req.setRolesList(permission.roles);

    const res = await namespaceServiceClient.grantPermissionOnSubscription(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(res.getStatus()?.getMessage());
      return;
    }

    notifySuccess(
      <span>Successfully granted permissions for subscription: <strong>{permission.subscription}</strong></span>,
      `permission-granted-${permission.subscription}`
    );

    await mutate(swrKey);
  }

  if (authActionsError) {
    notifyError(`Unable to get permissions. ${authActionsError}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<Element>, index: number) => {
    if (!inputsValue || !permissionsList || inputsValue[index].length === 0) return;
    switch (event.key) {
      case 'Enter':
        setOption((prev) => [...prev, createOption(inputsValue[index])]);

        setPermissionsList(Object.assign(
          [...permissionsList],
          {[index]: {
            subscription: permissionsList[index].subscription,
            roles: [...permissionsList[index].roles, inputsValue[index]]
          }}
        ))

        setInputsValue(Object.assign(
          [...inputsValue],
          { [index]: '' }
        ))

        event.preventDefault();
    }
  };

  const handleKeyDownForNew = (event: React.KeyboardEvent<Element>) => {
    if (newPermission.inputValue.length === 0) return;
    switch (event.key) {
      case 'Enter':
        setOption((prev) => [...prev, createOption(newPermission.inputValue)]);

        setNewPermission({
          ...newPermission,
          roles: [...newPermission.roles, newPermission.inputValue],
          inputValue: ''
        })

        event.preventDefault();
    }
  };

  return (
    <div className={`${s.SubscriptionsTable}`}>
      <H1>
        Subscribtion permissions
      </H1>
      <div className={`${s.Title} ${s.Line}`}>
        <div className={`${s.LeftSide}`}>
          <H3>Subscription</H3>
        </div>
        <div className={`${s.RightSide}`}>
          <H3>Roles</H3>
        </div>
      </div>
      
      {permissionsList && permissions && permissionsList.map((permission, index) => (
        <div className={`${s.Line}`}>
          <div className={`${s.LeftSide} ${s.SubscriptionName}`}>
            {permission.subscription}
          </div>

          <div className={`${s.RightSide}`}>
            <CreatableSelect
              isMulti
              options={option}
              value={permission.roles.map(createOption)}
              onChange={(options) => {
                setPermissionsList(Object.assign(
                  [...permissionsList],
                  {[index]: {
                    subscription: permissionsList[index].subscription,
                    roles: options.map(option => option.value),
                  }}
                ))
              }}
              inputValue={inputsValue[index]}
              onInputChange={(newValue) => {
                setInputsValue(Object.assign(
                  [...inputsValue],
                  { [index]: newValue }
                ))
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
            <div className={`${s.Buttons}`}>
              <Button
                type='danger'
                onClick={() => revoke(index)}
                text='Revoke'
              />
              <Button
                type='regular'
                onClick={() => reset(index)}
                text='Reset'
              />
              <Button
                type='primary'
                onClick={() => grant(permissionsList[index])}
                text='Grant'
                disabled={
                  permissionsList[index].roles === permissions[index].roles ||
                  permissionsList[index].roles.length === 0
                }
              />
            </div>
          </div>
        </div>
      ))}

      <div className={`${s.Line}`}>
        <div className={`${s.LeftSide}`}>
          <Input
            type='text'
            value={newPermission?.subscription || ''}
            onChange={(v) => setNewPermission({ ...newPermission, subscription: v})}
            placeholder='subscription-on-produce'
            inputProps={{
              onKeyDown: (e) => {
                if (
                  e.key === 'Enter' &&
                  newPermission.subscription.length !== 0 &&
                  newPermission.roles.length !== 0
                ) {
                  grant(newPermission),
                  setNewPermission(defaultPermission)
                }
              }
            }}
          />
        </div>
        <div className={`${s.RightSide}`}>
          <CreatableSelect
            isMulti
            value={newPermission.roles.map(createOption)}
            options={option}
            onChange={(options) => {
              setNewPermission({
                ...newPermission,
                roles: [...options.map(option => option.value)]
              })
            }}
            inputValue={newPermission.inputValue}
            onInputChange={(newValue) => {
              setNewPermission({
                ...newPermission,
                inputValue: newValue
              })
            }}
            onKeyDown={handleKeyDownForNew}
          />
          <div className={`${s.Buttons}`}>
            <Button
              type='primary'
              onClick={() => {
                grant(newPermission),
                setNewPermission(defaultPermission)
              }}
              text='Grant'
              disabled={
                newPermission.subscription.length === 0 ||
                newPermission.roles.length === 0
              }
            />
          </div>
        </div>
      </div>

    </div>
  )
}

export default SubscriptionPermissions;
