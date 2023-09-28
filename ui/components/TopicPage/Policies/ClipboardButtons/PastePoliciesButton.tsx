import React from "react";
import {sessionStorageKeys} from "../../../session-storage-keys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import {mutate} from "swr";
import {swrKeys} from "../../../swrKeys";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import SmallButton from "../../../ui/SmallButton/SmallButton";
import pasteIcon from "./icons/paste.svg";
import PastePoliciesDialog from "./PastePoliciesDialog";
import {PastePoliciesRequest} from "../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb";

type PastePoliciesButtonProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent',
  isGlobal: boolean,
  sessionId: string | null,
  setReloadKey: React.Dispatch<React.SetStateAction<number>>,
}

const PastePoliciesButton: React.FC<PastePoliciesButtonProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const modals = Modals.useContext();
  const { notifySuccess, notifyError, notifyInfo, notifyWarn } = Notifications.useContext();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`

  const pastePoliciesFromClipboard = React.useCallback(async () => {
    notifyInfo('Pasting topic policies...');

    const req = new PastePoliciesRequest();
    req.setTopicFqn(topicFqn);

    if (!sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId)) {
      notifyInfo("Copy topic policies first.");
      return;
    }

    req.setPoliciesClipboardId(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId) ?? '');

    const res = await topicPoliciesServiceClient.pastePolicies(req, {})
      .catch(err => notifyError(`Failed to paste some topic policies: ${err.message}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Failed to paste topic policies: ${res.getStatus()?.getMessage()}`);
      return;
    }

    if (res.getErrorsMap().toArray().length > 0) {
      notifyWarn(
        <>
          <span>Failed to paste some policies:</span>
          <div>
            {res.getErrorsMap().getEntryList().map(([errorKey, errorDescription], index) => (
              <div key={index}><strong>{index + 1})</strong> {errorKey}: {errorDescription}</div>
            ))}
          </div>
        </>
      );
    }

    switch (props.topicType) {
      case 'non-persistent':
        await Promise.all(
          [
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "backlogQuota", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "compactionThreshold", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "deduplication", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "deduplicationSnapshotInterval", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "delayedDelivery", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "dispatchRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "inactiveTopicPolicies", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxConsumersPerSubscription", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxConsumers", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxMessageSize", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxProducers", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxSubscriptionsPerTopic", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxUnackedMessagesPerConsumer", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxUnackedMessagesPerSubscription", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "messageTtl", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "persistence", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "publishRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "replicatorDispatchRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "retention", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "schemaCompatibilityStrategy", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "subscribeRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "subscriptionDispatchRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "subscriptionTypesEnabled", isGlobal: props.isGlobal}))
          ]
        )
        break;
      case 'persistent':
        await Promise.all(
          [
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "backlogQuota", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "compactionThreshold", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "deduplication", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "deduplicationSnapshotInterval", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "delayedDelivery", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "dispatchRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "inactiveTopicPolicies", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxConsumersPerSubscription", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxConsumers", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxMessageSize", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxProducers", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxSubscriptionsPerTopic", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxUnackedMessagesPerConsumer", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "maxUnackedMessagesPerSubscription", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "messageTtl", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "persistence", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "publishRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "replicatorDispatchRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "retention", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "schemaCompatibilityStrategy", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "subscribeRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "subscriptionDispatchRate", isGlobal: props.isGlobal})),
            mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy: "subscriptionTypesEnabled", isGlobal: props.isGlobal}))
          ]
        )
        break;
    }

    props.setReloadKey(value => value + 1);

    notifySuccess('Topic policies pasted.');
  }, [topicFqn]);

  return (
    <SmallButton onClick={() => {
      modals.push({
        id: "paste-warning-dialog",
        title: `Paste clipboard policies`,
        content: (
          <PastePoliciesDialog
            topicFqn={topicFqn}
            isGlobal={props.isGlobal}
            pastePoliciesFromClipboard={pastePoliciesFromClipboard}
          />
        ),
        styleMode: "no-content-padding",
      });
    }} type={"regular"} text={"Paste"} svgIcon={pasteIcon} disabled={props.sessionId === null}/>
  );
}

export default PastePoliciesButton;