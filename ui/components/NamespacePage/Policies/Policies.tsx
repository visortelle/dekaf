import React from 'react';

import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import replicationClustersField from './fields/replication-clusters';
import subscriptionTypesEnabledField from './fields/subscription-types-enabled';
import backlogQuotaField from './fields/backlog-quota';
import persistenceField from './fields/persistence';
import messageTtlField from './fields/message-ttl';
import maxSubscriptionsPerTopicField from './fields/max-subscriptions-per-topic';
import subscriptionExpirationTimeField from './fields/subscription-expiration-time';
import antiAffinityGroupField from './fields/anti-affinity-group';
import deduplicationField from './fields/deduplication';
import autoSubscriptionCreationField from './fields/auto-subscription-creation';
import retentionField from './fields/retention';
import bookieAffinityGroupField from './fields/bookie-affinity-group';
import autoTopicCreationField from './fields/auto-topic-creation';
import encryptionRequiredField from './fields/encryption-required';
import subscriptionAuthModeField from './fields/subscription-auth-mode';
import delayedDeliveryField from './fields/delayed-delivery';
import dispatchRateField from './fields/dispatch-rate';
import subscribeRateField from './fields/subscribe-rate';
import subscriptionDispatchRateField from './fields/subscription-dispatch-rate';
import replicatorDispatchRateField from './fields/replicator-dispatch-rate';
import inactiveTopicPoliciesField from './fields/inactive-topic-policies';
import maxProducersPerTopicField from './fields/max-producers-per-topic';
import maxConsumersPerTopicField from './fields/max-consumers-per-topic';
import maxTopicsPerNamespaceField from './fields/max-topics-per-namespace';
import maxConsumersPerSubscriptionField from './fields/max-consumers-per-subscription';
import maxUnackedMessagesPerSubscriptionField from './fields/max-unacked-messages-per-subscription';
import maxUnackedMessagesPerConsumerField from './fields/max-unacked-messages-per-consumer';
import compactionThresholdField from './fields/compaction-threshold';
import deduplicationSnapshotIntervalField from './fields/deduplication-shapshot-interval';
import schemaCompatibilityStrategyField from './fields/schema-compatibility-strategy';
import isAllowAutoUpdateSchemaField from './fields/allow-auto-update-schema';
import schemaValidationEnforceField from './fields/schema-validation-enforce';
import offloadPoliciesField from './fields/offload-policies/offload-policies';
import publishRateField from './fields/publish-rate';
import resourceGroupField from './fields/resource-group';
import propertiesField from './fields/properties';
import Tabs from '../../ui/Tabs/Tabs';

import s from './Policies.module.css'
import {sessionStorageKeys} from "../../session-storage-keys";
import PastePoliciesButton from "./ClipboardButtons/PastePoliciesButton";
import CopyPoliciesButton from "./ClipboardButtons/CopyPoliciesButton";

export type PoliciesProps = {
  tenant: string;
  namespace: string;
};

type TabsKey =
  'namespace-config' |
  'topics' |
  'consumers' |
  'subscriptions' |
  'retention' |
  'deduplication' |
  'schema' |
  'affinity' |
  'encryption' |
  'tiered-storage';

const Policies: React.FC<PoliciesProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<TabsKey>('namespace-config');
  const [reloadKey, setReloadKey] = React.useState<number>(0);
  const [sessionId, setSessionId] = React.useState<string | null>(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId));

  return (
    <div className={s.Policies}>
      <div className={s.ClipboardControls}>
        <CopyPoliciesButton tenant={props.tenant} namespace={props.namespace} sessionId={sessionId} setSessionId={setSessionId} />
        <PastePoliciesButton tenant={props.tenant} namespace={props.namespace} sessionId={sessionId} setReloadKey={setReloadKey} />
      </div>
      <div className={s.Tabs} key={reloadKey}>
        <Tabs<TabsKey>
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          tabs={{
            "namespace-config": {
              title: 'Namespace',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Namespace"
                    fields={[
                      replicationClustersField,
                      propertiesField,
                      persistenceField,
                      maxTopicsPerNamespaceField,
                      compactionThresholdField,
                      delayedDeliveryField,
                      resourceGroupField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            topics: {
              title: 'Topics',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Topics"
                    fields={[
                      autoTopicCreationField,
                      inactiveTopicPoliciesField,
                      maxProducersPerTopicField,
                      maxConsumersPerTopicField,
                      maxSubscriptionsPerTopicField,
                      publishRateField,
                      dispatchRateField,
                      subscribeRateField,
                      replicatorDispatchRateField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            consumers: {
              title: 'Consumers',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Consumer"
                    fields={[
                      maxUnackedMessagesPerConsumerField
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            subscriptions: {
              title: 'Subscriptions',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Subscriptions"
                    fields={[
                      autoSubscriptionCreationField,
                      subscriptionTypesEnabledField,
                      subscriptionDispatchRateField,
                      subscriptionExpirationTimeField,
                      subscriptionAuthModeField,
                      maxConsumersPerSubscriptionField,
                      maxUnackedMessagesPerSubscriptionField
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            retention: {
              title: 'Retention',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Retention"
                    fields={[
                      retentionField,
                      backlogQuotaField,
                      messageTtlField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            deduplication: {
              title: 'Deduplication',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Deduplication"
                    fields={[
                      deduplicationField,
                      deduplicationSnapshotIntervalField
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            schema: {
              title: 'Schema',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Schema"
                    fields={[
                      schemaValidationEnforceField,
                      schemaCompatibilityStrategyField,
                      isAllowAutoUpdateSchemaField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            affinity: {
              title: 'Affinity',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Affinity"
                    fields={[
                      antiAffinityGroupField,
                      bookieAffinityGroupField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            encryption: {
              title: 'Encryption',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Encryption"
                    fields={[
                      encryptionRequiredField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            'tiered-storage': {
              title: 'Tiered Storage',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Tiered storage"
                    fields={[
                      offloadPoliciesField
                    ].map(field => field(props))}
                  />
                </div>
              )
            }
          }}
        />
      </div>
    </div>
  );
}

export default Policies;
