import React from "react";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";
import * as pbt from "../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import s from "./BundleTopics.module.css";
import useSwr from "swr";
import {swrKeys} from "../../../swrKeys";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import NothingToShow from "../../../ui/NothingToShow/NothingToShow";

type BundleTopicsProps = {
  tenant: string;
  namespace: string;
  bundle: string;
}

const BundleTopics: React.FC<BundleTopicsProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();

  const namespaceFqn = `${props.tenant}/${props.namespace}`;

  const { data: bundleTopics, error: bundleTopicsError, isLoading: isBundleTopicsLoading } = useSwr(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.bundles.bundle.listTopics._({
      tenant: props.tenant,
      namespace: props.namespace,
      bundle: props.bundle
    }),
    async () => {
      const req = new pbt.ListBundleTopicsRequest()
      req.setNamespace(namespaceFqn);
      req.setBundle(props.bundle);

      const res = await topicServiceClient.listBundleTopics(req, null)
        .catch((err) => notifyError(`Unable to get bundle topics. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() === Code.NOT_FOUND) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get bundle topics. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTopicsList();
    }
  );

  return (
    <div className={s.BundleTopics}>
      <h3>Topics</h3>
      {bundleTopics ? (
        <div className={s.BundleTopicsList}>
          {bundleTopics.map((topic) => (
            <div>{topic}</div>
          ))}
        </div>
      ) : (
        <NothingToShow reason={'no-items-found'} />
      )}
    </div>
  );
}

export default BundleTopics;