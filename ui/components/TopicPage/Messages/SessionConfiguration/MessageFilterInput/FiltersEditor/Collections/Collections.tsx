import React, { useState } from 'react';
import { useSWRConfig } from 'swr';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';

import ActionButton from '../../../../../../ui/ActionButton/ActionButton';
import Button from '../../../../../../ui/Button/Button';
import { H3 } from '../../../../../../ui/H/H';
import Input from '../../../../../../ui/Input/Input';
import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { Code } from '../../../../../../../grpc-web/google/rpc/code_pb';
import * as Notifications from '../../../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { swrKeys } from '../../../../../../swrKeys';
import { CollectionsFilters } from '../FiltersEditor';

import deleteIcon from '../../icons/delete.svg';
import createIcon from '../../icons/create.svg';
import duplicateIcon from '../../icons/duplicate.svg';
import editIcon from '../../icons/edit.svg';

import s from '../FiltersEditor.module.css';

type Props = {
  activeCollection: string | undefined,
  activeFilter: string | undefined,
  listFilters: CollectionsFilters,
  entry?: string,

  setActiveCollection: (collection: undefined | string) => void,
  setActiveFilter: (filter: undefined | string) => void,
  setListFilters: (filters: CollectionsFilters) => void,
}

const Collections = (props: Props) => {

  const { libraryServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.filters._();

  const { activeCollection, listFilters, entry, activeFilter, setActiveCollection, setActiveFilter, setListFilters, } = props;

  const [renameCollection, setRenameCollection] = useState<string | undefined>();

  const onCreateCollection = async () => {
    const collection = new pb.Collection()
    collection.setName("new collection");
    collection.setDescription("");

    const req = new pb.CreateCollectionRequest();
    req.setCollection(collection);
    const res = await libraryServiceClient.createCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create collection: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  type UpdateCollectionProps = {
    name?: string,
    description?: string,
    item?: string,
  }

  const addNewFilter = (collection: string) => {
    if (props.entry != undefined) {
      const newFilterId = uuid().toString();

      const newCollection = cloneDeep(listFilters);

      if (activeCollection && activeFilter) {
        delete newCollection[activeCollection].filters[activeFilter];
      }

      newCollection[collection].filters[newFilterId] = {
        schemaVersion: "",
        version: "",
        accessConfig: {
          userReadRoles: [],
          userWriteRoles: [],
          topicPatterns: []
        },
        filter: {
          name: "New filter",
          description: "",
          value: props.entry,
        },
        requirements: [],
        libraryItem: { code: props.entry }
      }

      setListFilters(newCollection);
      setActiveFilter(newFilterId);
    }
  }

  const onUpdateCollection = async (collectionData: UpdateCollectionProps) => {
    if (!activeCollection) {
      return;
    }

    const updateCollection = new pb.Collection();
    updateCollection.setId(activeCollection);
    updateCollection.setName(collectionData.name || listFilters[activeCollection].name);
    updateCollection.setDescription(collectionData.description || listFilters[activeCollection].description);
    updateCollection.setCollectionItemIdsList(collectionData.item ? [ ...Object.keys(listFilters[activeCollection].filters), collectionData.item ] : Object.keys(listFilters[activeCollection].filters));

    const req = new pb.UpdateCollectionRequest();
    req.setCollection(updateCollection);
    const res = await libraryServiceClient.updateCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save collection: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  const onDuplicateCollection = async () => {
    if (!activeCollection) {
      return;
    }

    const collection = new pb.Collection();
    collection.setName(`${listFilters[activeCollection].name}-dublicate`);
    collection.setDescription(listFilters[activeCollection].description);
    collection.setCollectionItemIdsList(Object.keys(listFilters[activeCollection].filters));

    const req = new pb.CreateCollectionRequest();
    req.setCollection(collection);
    const res = await libraryServiceClient.createCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create collection: ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
  }

  const onDeleteCollection = async () => {
    if (!activeCollection) {
      return;
    }

    const req = new pb.DeleteCollectionRequest();
    req.setId(activeCollection);
    const res = await libraryServiceClient.deleteCollection(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete collection: ${res.getStatus()?.getMessage()}`);
    }

    setActiveCollection(undefined);
    setActiveFilter(undefined);
    await mutate(swrKey);
  }

  const switchCollection = (collection: string) => {
    if (entry == undefined) {
      setActiveFilter(undefined);
    }

    if (entry != undefined) {
      addNewFilter(collection);
    }

    setActiveCollection(collection);
  }

  return (
    <div className={`${s.Column}`}>
      <div className={`${s.Collections}`}>
        <H3>
          Collections
        </H3>
        {Object.keys(listFilters).map(collection => (
          <span
            key={collection}
            onClick={() => switchCollection(collection)}
            className={`${s.Inactive} ${activeCollection === collection && s.Active}`}
          >
            {listFilters[collection].name}
          </span>
        ))}
      </div>
      <div className={`${s.Buttons}`}>

        <Button
          svgIcon={deleteIcon}
          onClick={() => onDeleteCollection()}
          type="danger"
          title="Delete collection"
          disabled={!activeCollection}
        />
        <Button
          svgIcon={duplicateIcon}
          onClick={() => onDuplicateCollection()}
          type="primary"
          title="Duplicate collection"
          disabled={!activeCollection}
        />
        <Button
          svgIcon={createIcon}
          onClick={() => onCreateCollection()}
          type='primary'
          title="Create collection"
        />

        <Button
          svgIcon={editIcon}
          onClick={() => activeCollection && setRenameCollection(listFilters[activeCollection].name)}
          type='regular'
          title="Rename collection"
          disabled={!activeCollection}
        />

        {renameCollection !== undefined && activeCollection &&
          <div className={s.RenameWindow}>
            <div className={s.HeadRenameWindow}>
              <span>
                Rename window
              </span>
              <ActionButton
                action={{ type: 'predefined', action: 'close' }}
                onClick={() => setRenameCollection(undefined)}
              />
            </div>
            <Input
              value={renameCollection}
              onChange={(value) => setRenameCollection(value)}
            />
            <div className={s.RenameWindowButtons}>
              <Button
                type="regular"
                onClick={() => setRenameCollection(listFilters[activeCollection].name)}
                disabled={renameCollection === listFilters[activeCollection].name}
                text="Reset"
              />
              <Button
                type="primary"
                onClick={() => onUpdateCollection({ name: renameCollection})}
                disabled={!renameCollection}
                text="Rename"
              />
            </div>
          </div>
        }

      </div>
    </div>
  )
}

export default Collections;