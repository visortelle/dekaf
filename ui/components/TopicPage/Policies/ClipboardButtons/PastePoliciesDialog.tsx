import useSWR, {mutate} from "swr";
import {swrKeys} from "../../../swrKeys";
import {sessionStorageKeys} from "../../../session-storage-keys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import ConfirmationDialog from "../../../ui/ConfirmationDialog/ConfirmationDialog";
import s from "./PastePoliciesButton.module.css"
import React from "react";
import {
  GetClipboardPoliciesSourceRequest, GetClipboardPoliciesSourceResponse, PastePoliciesRequest
} from "../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb";

type PastePoliciesDialogProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent',
  topicFqn: string,
  isGlobal: boolean,
  sessionId: string | null,
  setReloadKey: React.Dispatch<React.SetStateAction<number>>,
}

const PastePoliciesDialog: React.FC<PastePoliciesDialogProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const modals = Modals.useContext();
  const { notifySuccess, notifyError, notifyInfo, notifyWarn } = Notifications.useContext();

  const { data: clipboardPoliciesSource } = useSWR(
    swrKeys.pulsar.customApi.clipboard.clipboardPoliciesSource._(),
    async () => {
      const req = new GetClipboardPoliciesSourceRequest();
      req.setPoliciesClipboardId(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId) ?? '');

      const res = await topicPoliciesServiceClient.getClipboardPoliciesSource(req, {})
        .catch(err => notifyError(`Failed to get clipboard policies source: ${err.message}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Failed to get clipboard policies source: ${res.getStatus()?.getMessage()}`);
        return;
      }

      switch (res.getClipboardPoliciesSourceCase()) {
        case GetClipboardPoliciesSourceResponse.ClipboardPoliciesSourceCase.SPECIFIED:
          return {
            sourceTopicFqn: res.getSpecified()?.getSourceTopicFqn(),
            isSourceGlobal: res.getSpecified()?.getIsSourceGlobal()
          };
        case GetClipboardPoliciesSourceResponse.ClipboardPoliciesSourceCase.UNSPECIFIED:
          return undefined;
      }
    }
  )

  const pastePoliciesFromClipboard = React.useCallback(async () => {
    notifyInfo('Pasting topic policies...');

    const req = new PastePoliciesRequest();
    req.setTopicFqn(props.topicFqn);
    req.setIsGlobal(props.isGlobal);
    props.sessionId && req.setPoliciesClipboardId(props.sessionId);

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

    const mutateLocalNonPersistentTopicPolicies = () => Promise.all(
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

    const mutateLocalPersistentTopicPolicies = () => Promise.all(
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

    props.topicType === 'persistent' ?
      await mutateLocalPersistentTopicPolicies() :
      await mutateLocalNonPersistentTopicPolicies();

    props.setReloadKey(value => value + 1);

    notifySuccess('Topic policies pasted.');
  }, [props.topicFqn, props.isGlobal, props.sessionId, props.setReloadKey]);

  return (
    <ConfirmationDialog
      description={
        <div className={s.DialogContents}>
          <div>You're going to paste {props.isGlobal && <strong>global</strong>} topic policies.</div>
          <div>
            <div><strong>Source: </strong>
              {!clipboardPoliciesSource ? (
                <span style={{color: "red"}}>undefined</span>
              ) : (
                <span>{clipboardPoliciesSource.sourceTopicFqn}</span>
              )}
              &nbsp;
              {clipboardPoliciesSource && clipboardPoliciesSource.isSourceGlobal &&
                <span>(<strong>global</strong>)</span>
              }
            </div>
            <div><strong>Target: </strong>{props.topicFqn} {props.isGlobal && <span>(<strong>global</strong>)</span>}</div>
          </div>
          <div>
            <div>This action may lead to losing data in the target topic as a result of wrong policies.</div>
            <div>Be sure you know what you're doing.</div>
          </div>
        </div>
      }
      disabled={clipboardPoliciesSource === undefined}
      onConfirm={() => {
        pastePoliciesFromClipboard();
        modals.pop();
      }}
      onCancel={modals.pop}
      type='normal'
    />
  );
}

export default PastePoliciesDialog;