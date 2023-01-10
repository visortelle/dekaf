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
      const collection = new Collection();
      collection.setName('user name');
      collection.setDescription('very complicated description');
      collection.setCollectionItemIdsList(['first', 'item', 'second', 'item'])

      const req = new CreateCollectionRequest();
      req.setCollection(collection)

      const req2 = new ListCollectionsRequest();
      const req3 = new UpdateCollectionRequest();
      const req4 = new DeleteCollectionRequest();
      const res = await libraryServiceClient.createCollection(req, {}).catch(err => notifyError(`Error: ${err}`));
      const res2 = await libraryServiceClient.listCollections(req2, {}).catch(err => notifyError(`Error: ${err}`));
      const res4 = await libraryServiceClient.deleteCollection(req4, {}).catch(err => notifyError(`Error: ${err}`));
      // if (res === undefined) {
      //   return [];
      // }
      // if (res.getStatus()?.getCode() !== Code.OK) {
      //   notifyError(`Unable to get available dynamic configuration keys: ${res.getStatus()?.getMessage()}`);
      //   return [];
      // }
      // return res.getNamesList();
    }
  );
  
  return (
    <div>

    </div>
  )
}

export default TestComponent;