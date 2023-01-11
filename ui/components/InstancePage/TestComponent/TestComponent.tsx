import React from 'react';
import useSWR from 'swr';

import {
  CreateCollectionRequest,
  ListCollectionsRequest,
  UpdateCollectionRequest,
  DeleteCollectionRequest,
  Collection
} from '../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import { v4 as uuid } from 'uuid';

import { swrKeys } from '../../swrKeys';

const TestComponent = () => {

  const { notifyError } = Notifications.useContext();
  const { libraryServiceClient } = PulsarGrpcClient.useContext();

  const { data: availableDynamicConfigKeys, error: availableDynamicConfigKeysError } = useSWR(
    swrKeys.pulsar.brokers.availableDynamicConfigKeys._(),
    async () => {
      const createCollection = new Collection();
      createCollection.setName('user name');
      createCollection.setDescription('very complicated description');
      createCollection.setCollectionItemIdsList(['first', 'item', 'second', 'item']);

      const req = new CreateCollectionRequest();
      req.setCollection(createCollection);
      const res = await libraryServiceClient.createCollection(req, {}).catch(err => notifyError(`Error: ${err}`));

      const req2 = new ListCollectionsRequest();
      const res2 = await libraryServiceClient.listCollections(req2, {});
      console.log(res2.getCollectionsList());

      const updateCollection = new Collection();
      updateCollection.setId('76ca6564-24c7-456f-b619-eac59519a25b');
      updateCollection.setName('user name');
      updateCollection.setDescription('very complicated description');
      updateCollection.setCollectionItemIdsList(['first', 'item', 'second', 'item']);
      const req3 = new UpdateCollectionRequest();
      req3.setCollection(updateCollection);
      const res3 = await libraryServiceClient.updateCollection(req3, {}).catch(err => notifyError(`Error: ${err}`));

      const req4 = new DeleteCollectionRequest();
      req4.setId('id')
      req4.setIsForce(true)
      const res4 = await libraryServiceClient.deleteCollection(req4, {}).catch(err => notifyError(`Error: ${err}`));
    }
  );
  
  return (
    <div>

    </div>
  )
}

export default TestComponent;