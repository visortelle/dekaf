import { NavigateFunction } from "react-router";
import { LibraryContext } from "../../LibraryBrowser/model/library-context";
import { ManagedItem } from "../../LibraryBrowser/model/user-managed-items";
import { routes } from "../../../routes";

export type NavigateToConsumerSessionProps = {
  libraryContext: LibraryContext,
  navigate: NavigateFunction,
  item: ManagedItem
};

export function navigateToConsumerSession(props: NavigateToConsumerSessionProps) {
  const { navigate, libraryContext, item } = props;

  if (libraryContext.pulsarResource.type === 'instance') {
    navigate(routes.instance.consumerSession._.get({
      managedConsumerSessionId: item.metadata.id
    }));
  }

  if (props.libraryContext.pulsarResource.type === 'tenant') {
    navigate(routes.tenants.tenant.consumerSession._.get({
      tenant: props.libraryContext.pulsarResource.tenant,
      managedConsumerSessionId: item.metadata.id
    }));
  }

  if (props.libraryContext.pulsarResource.type === 'namespace') {
    navigate(routes.tenants.tenant.namespaces.namespace.consumerSession._.get({
      tenant: props.libraryContext.pulsarResource.tenant,
      namespace: props.libraryContext.pulsarResource.namespace,
      managedConsumerSessionId: item.metadata.id
    }));
  }

  if (props.libraryContext.pulsarResource.type === 'topic') {
    navigate(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.get({
      tenant: props.libraryContext.pulsarResource.tenant,
      namespace: props.libraryContext.pulsarResource.namespace,
      topic: props.libraryContext.pulsarResource.topic,
      topicPersistency: props.libraryContext.pulsarResource.topicPersistency,
      managedConsumerSessionId: item.metadata.id
    }));
  }
}
