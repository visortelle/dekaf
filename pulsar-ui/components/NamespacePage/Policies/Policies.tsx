import React from 'react';
import s from './Policies.module.css'
import useSWR, { useSWRConfig } from 'swr';
import { ConfigurationField, ListValue } from '../../ConfigurationTable/values';
import ConfigurationTable from '../../ConfigurationTable/ConfigurationTable';
import * as Notifications from '../../contexts/Notifications';
import * as PulsarAdminClient from '../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import StringEditor from '../../ConfigurationTable/String/StringEditor/StringEditor';
import SelectInput from '../../ConfigurationTable/SelectInput/SelectInput';
export type PoliciesProps = {
  tenant: string;
  namespace: string;
};

const Policies: React.FC<PoliciesProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update namespace policies: ${err}`);

  const { data: policies, error: policiesError } = useSWR(
    ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies'],
    async () => await adminClient.namespaces.getPolicies(props.tenant, props.namespace)
  );

  console.log('p', policies);

  return (
    <div className={s.Policies}>
      policies
    </div>
  );
}

export default Policies;
