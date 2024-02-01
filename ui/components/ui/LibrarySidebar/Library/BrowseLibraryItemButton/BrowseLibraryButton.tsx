import React from 'react';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../LibraryBrowser/model/user-managed-items';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import SmallButton from '../../../SmallButton/SmallButton';
import { v4 as uuid } from 'uuid';
import BrowseDialog from '../../../LibraryBrowser/dialogs/BrowseDialog/BrowseDialog';
import browseIcon from './browse.svg';
import { useNavigate } from 'react-router';
import { routes } from '../../../../routes';

export type BrowseLibraryButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext,
};

const BrowseLibraryButton: React.FC<BrowseLibraryButtonProps> = (props) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();

  return (
    <SmallButton
      type='regular'
      appearance='borderless-semitransparent'
      text='Browse'
      svgIcon={browseIcon}
      onClick={() => {
        modals.push({
          id: `browser-library-${uuid()}`,
          title: `Browse Library`,
          content: (
            <BrowseDialog
              itemType={props.itemType}
              libraryContext={props.libraryContext}
              onCanceled={modals.pop}
              onSelected={(v) => {
                if(props.libraryContext.pulsarResource.type === 'instance') {
                  navigate(routes.instance.consumerSession._.get({
                    managedConsumerSessionId: v.spec.metadata.id
                  }));
                }

                if (props.libraryContext.pulsarResource.type === 'tenant') {
                  navigate(routes.tenants.tenant.consumerSession._.get({
                    tenant: props.libraryContext.pulsarResource.tenant,
                    managedConsumerSessionId: v.spec.metadata.id
                  }));
                }

                if (props.libraryContext.pulsarResource.type === 'namespace') {
                  navigate(routes.tenants.tenant.namespaces.namespace.consumerSession._.get({
                    tenant: props.libraryContext.pulsarResource.tenant,
                    namespace: props.libraryContext.pulsarResource.namespace,
                    managedConsumerSessionId: v.spec.metadata.id
                  }));
                }

                if (props.libraryContext.pulsarResource.type === 'topic') {
                  navigate(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.get({
                    tenant: props.libraryContext.pulsarResource.tenant,
                    namespace: props.libraryContext.pulsarResource.namespace,
                    topic: props.libraryContext.pulsarResource.topic,
                    topicPersistency: props.libraryContext.pulsarResource.topicPersistency,
                    managedConsumerSessionId: v.spec.metadata.id
                  }));
                }

                modals.pop();
              }}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export default BrowseLibraryButton;
