import React from 'react';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../LibraryBrowser/model/user-managed-items';
import { useNavigate } from 'react-router';
import { routes } from '../../../../routes';
import PickLibraryItemButton from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/PickLibraryItemButton/PickLibraryItemButton';
import { ResourceMatcher } from '../../../LibraryBrowser/model/resource-matchers';

export type BrowseLibraryButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext,
  availableForContexts: ResourceMatcher[],
  onItemCount: (count: number) => void
};

const BrowseLibraryButton: React.FC<BrowseLibraryButtonProps> = (props) => {
  const navigate = useNavigate();

  return (
    <PickLibraryItemButton
      itemType={props.itemType}
      libraryContext={props.libraryContext}
      availableForContexts={props.availableForContexts}
      onItemCount={props.onItemCount}
      onPick={(v) => {
        if (props.libraryContext.pulsarResource.type === 'instance') {
          navigate(routes.instance.consumerSession._.get({
            managedConsumerSessionId: v.metadata.id
          }));
        }

        if (props.libraryContext.pulsarResource.type === 'tenant') {
          navigate(routes.tenants.tenant.consumerSession._.get({
            tenant: props.libraryContext.pulsarResource.tenant,
            managedConsumerSessionId: v.metadata.id
          }));
        }

        if (props.libraryContext.pulsarResource.type === 'namespace') {
          navigate(routes.tenants.tenant.namespaces.namespace.consumerSession._.get({
            tenant: props.libraryContext.pulsarResource.tenant,
            namespace: props.libraryContext.pulsarResource.namespace,
            managedConsumerSessionId: v.metadata.id
          }));
        }

        if (props.libraryContext.pulsarResource.type === 'topic') {
          navigate(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.get({
            tenant: props.libraryContext.pulsarResource.tenant,
            namespace: props.libraryContext.pulsarResource.namespace,
            topic: props.libraryContext.pulsarResource.topic,
            topicPersistency: props.libraryContext.pulsarResource.topicPersistency,
            managedConsumerSessionId: v.metadata.id
          }));
        }
      }}
    />
  );
}

export default BrowseLibraryButton;
