import React from 'react';
import s from './Policies.module.css'
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import { swrKeys } from '../../../swrKeys';
import { GetIsAllowAutoUpdateSchemaRequest, GetSchemaCompatibilityStrategyRequest, GetSchemaValidationEnforceRequest, SchemaCompatibilityStrategy } from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import useSWR from 'swr';
import editIcon from '!!raw-loader!./edit.svg';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { H3 } from '../../../ui/H/H';
import Button from '../../../ui/Button/Button';
import Link from '../../../ui/LinkWithQuery/LinkWithQuery';
import { routes } from '../../../routes';

export type PoliciesProps = {
  topic: string,
};

type Strategy = keyof typeof SchemaCompatibilityStrategy;

const Policies: React.FC<PoliciesProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const tenant = `${props.topic.split('://')[1].split('/')[0]}`;
  const namespace = `${props.topic.split('://')[1].split('/')[1]}`;

  const schemaValidationEnforceSwrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant, namespace, policy: 'schemaValidationEnforce' });

  const { data: schemaValidationEnforce, error: schemaValidationEnforceError } = useSWR(
    schemaValidationEnforceSwrKey,
    async () => {
      const req = new GetSchemaValidationEnforceRequest();
      req.setNamespace(`${tenant}/${namespace}`);
      const res = await namespaceServiceClient.getSchemaValidationEnforce(req, {}).catch(err => notifyError(`Can't get schema validation enforce policy. ${err}`))
      if (res === undefined) {
        return;
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get schema validation enforce: ${res.getStatus()?.getMessage()}`);
        return;
      }
      return res.getSchemaValidationEnforced();
    }
  );

  const schemaCompatibilityStrategySwrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant, namespace, policy: 'schemaCompatibilityStrategy' });

  const { data: strategy, error: strategyError } = useSWR(
    schemaCompatibilityStrategySwrKey,
    async () => {
      const req = new GetSchemaCompatibilityStrategyRequest();
      req.setNamespace(`${tenant}/${namespace}`);
      const res = await namespaceServiceClient.getSchemaCompatibilityStrategy(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        return undefined;
      }
      return (Object.entries(SchemaCompatibilityStrategy).find(([_, i]) => i === res.getStrategy()) || [])[0] as Strategy;
    },
  );

  if (strategyError) {
    notifyError(`Can't get schema compatibility strategy: ${strategyError}`);
  }


  const isAllowAutoUpdateSchemaSwrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant, namespace, policy: 'isAllowAutoUpdateSchema' });

  const { data: isAllowAutoUpdateSchema, error: isAllowAutoUpdateSchemaError } = useSWR(
    isAllowAutoUpdateSchemaSwrKey,
    async () => {
      const req = new GetIsAllowAutoUpdateSchemaRequest();
      req.setNamespace(`${tenant}/${namespace}`);
      const res = await namespaceServiceClient.getIsAllowAutoUpdateSchema(req, {}).catch(err => notifyError(`Can't get is allow auto update schema policy. ${err}`));
      if (res === undefined) {
        return;
      }

      return res.getIsAllowAutoUpdateSchema() ? 'enabled' : 'disabled';
    }
  );

  if (isAllowAutoUpdateSchemaError) {
    notifyError(`Unable to get deduplication: ${isAllowAutoUpdateSchemaError}`);
  }


  return (
    <div className={s.Policies}>
      <a className={s.EditButton} title="Edit namespace level policies" href={routes.tenants.tenant.namespaces.namespace.policies._.get({ tenant, namespace }) + '#schema'}>
        <Button onClick={() => { }} title="Edit" type="regular" svgIcon={editIcon} />
      </a>
      <div className={s.Header}>
        <H3>Schema policies</H3>
      </div>
      <div className={s.FormControl}>
        <strong>Schema compatibility strategy:</strong> {strategy?.replace('SCHEMA_COMPATIBILITY_STRATEGY_', '')}
      </div>
      <div className={s.FormControl}>
        <strong>Allow schema auto update:</strong> {isAllowAutoUpdateSchema ? 'Allow' : 'Not allow'}
      </div>
      <div className={s.FormControl}>
        <strong>Schema validation enforce:</strong> {schemaValidationEnforce ? 'Enforced' : 'Not enforced'}
      </div>

    </div>
  );
}

export default Policies;
