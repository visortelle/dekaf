import React from "react";
import {Params} from "react-router-dom";
import * as GrpcClient from "../../contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../contexts/Notifications";
import useSWR from "swr";
import {swrKeys} from "../../../swrKeys";
import {
  CheckResourceExistsRequest, NamespaceResource,
  SchemaResource, SubscriptionResource, TenantResource, TopicResource
} from "../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import PageNotFound from "../../../ui/PageNotFound/PageNotFound";

const ResourceExistsOr404: React.FC<{
  children: React.ReactElement,
  params: Readonly<Params>
}> = (props) => {
  const { tenant, namespace, topic, topicPersistency, schemaVersion, subscription } = props.params;
  const { brokersServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const { data: isResourceExists, isLoading: isResourceExistsLoading, error: isResourceExistsError } = useSWR(
    swrKeys.pulsar.customApi.checkResourceExists._({
      tenant: tenant,
      namespace: namespace,
      topic: topic,
      topicPersistency: topicPersistency,
      schemaVersion: schemaVersion,
      subscription: subscription
    }),
    async () => {
      const req = new CheckResourceExistsRequest();

      if (schemaVersion !== undefined && tenant !== undefined && namespace !== undefined && topic !== undefined && topicPersistency !== undefined) {
        req.setResourceFqn(`${topicPersistency}://${tenant}/${namespace}/${topic}`);
        req.setSchemaResource(new SchemaResource().setSchemaVersion(Number(schemaVersion)));
      } else if (subscription !== undefined && tenant !== undefined && namespace !== undefined && topic !== undefined && topicPersistency !== undefined) {
        req.setResourceFqn(`${topicPersistency}://${tenant}/${namespace}/${topic}`);
        req.setSubscriptionResource(new SubscriptionResource().setSubscriptionName(subscription));
      } else if (tenant !== undefined && namespace !== undefined && topic !== undefined && topicPersistency !== undefined) {
        req.setResourceFqn(`${topicPersistency}://${tenant}/${namespace}/${topic}`);
        req.setTopicResource(new TopicResource());
      } else if (tenant !== undefined && namespace !== undefined) {
        req.setResourceFqn(`${tenant}/${namespace}`);
        req.setNamespaceResource(new NamespaceResource());
      } else if (tenant !== undefined) {
        req.setResourceFqn(`${tenant}`);
        req.setTenantResource(new TenantResource());
      } else {
        return true;
      }

      const res = await brokersServiceClient.checkResourceExists(req, {})
        .catch((err) => notifyError(`Unable to check resource exists. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to check resource exists. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getIsExists();
    }, { refreshInterval: 0 })

  if (isResourceExistsLoading) {
    return <>Loading...</>;
  }

  if (isResourceExists) {
    return props.children;
  }

  return <PageNotFound />;
}

export default ResourceExistsOr404;
