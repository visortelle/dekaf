import React from "react";
import {
  PasteNamespacePoliciesRequest
} from "../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb";
import {sessionStorageKeys} from "../../../session-storage-keys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import {mutate} from "swr";
import {swrKeys} from "../../../swrKeys";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Modals from "../../../app/contexts/Modals/Modals";
import * as Notifications from "../../../app/contexts/Notifications";
import SmallButton from "../../../ui/SmallButton/SmallButton";
import pasteIcon from "../icons/paste.svg";
import PastePoliciesDialog from "./PastePoliciesDialog";

type PastePoliciesButtonProps = {
  tenant: string,
  namespace: string,
  sessionId: string | null,
  setReloadKey: React.Dispatch<React.SetStateAction<number>>,
}

const PastePoliciesButton: React.FC<PastePoliciesButtonProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const modals = Modals.useContext();
  const { notifySuccess, notifyError, notifyInfo, notifyWarn } = Notifications.useContext();

  const pastePoliciesFromClipboard = React.useCallback(async () => {
    notifyInfo('Pasting namespace policies...');

    const req = new PasteNamespacePoliciesRequest();
    req.setNamespaceFqn(`${props.tenant}/${props.namespace}`);

    if (!sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId)) {
      notifyInfo("Copy namespace policies first.");
      return;
    }

    req.setPoliciesClipboardId(sessionStorage.getItem(sessionStorageKeys.pulsocatBrowserSessionId) ?? '');

    const res = await namespacePoliciesServiceClient.pasteNamespacePolicies(req, {})
      .catch(err => notifyError(`Failed to paste some namespace policies: ${err.message}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Failed to paste namespace policies: ${res.getStatus()?.getMessage()}`);
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

    await Promise.all(
      [
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "isAllowAutoUpdateSchema" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "antiAffinityGroup" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "autoSubscriptionCreation" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "autoTopicCreation" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "offloadPolicies" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "backlogQuota" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "bookieAffinityGroup" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "compactionThreshold" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "deduplication" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "deduplicationSnapshotInterval" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "delayedDelivery" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "dispatchRate" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "encryptionRequired" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "inactiveTopicPolicies" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "maxConsumersPerSubscription" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "maxConsumersPerTopic" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "maxProducersPerTopic" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "maxSubscriptionsPerTopic" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "maxTopicsPerNamespace" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "maxUnackedMessagesPerConsumer" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "maxUnackedMessagesPerSubscription" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,policy: "messageTtl" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,policy: "persistence" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,policy: "properties" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,policy: "publishRate" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,policy: "replicationClusters" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,policy: "replicatorDispatchRate" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "resourceGroup" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "retention" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy: "schemaCompatibilityStrategy" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "schemaValidationEnforce" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "subscribeRate" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "subscriptionAuthMode" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "subscriptionDispatchRate" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "subscriptionExpirationTime" })),
        mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace,  policy: "subscriptionTypesEnabled" })),
      ]
    )

    props.setReloadKey(value => value + 1);

    notifySuccess('Namespace policies pasted.');
  }, [props.namespace]);

  return (
    <SmallButton onClick={() => {
      modals.push({
        id: "paste-warning-dialog",
        title: `Paste clipboard policies`,
        content: (
          <PastePoliciesDialog
            tenant={props.tenant}
            namespace={props.namespace}
            pastePoliciesFromClipboard={pastePoliciesFromClipboard}
          />
        ),
        styleMode: "no-content-padding",
      });
    }} type={"regular"} text={"Paste"} svgIcon={pasteIcon} disabled={props.sessionId === null}/>
  );
}

export default PastePoliciesButton;