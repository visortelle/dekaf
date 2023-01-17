import React, { useEffect, useState } from 'react';
import _, { cloneDeep } from 'lodash';
import useSWR, { useSWRConfig } from "swr";
import { v4 as uuid } from 'uuid';
import stringify from "safe-stable-stringify";

import { DefaultProvider } from '../../../../../app/contexts/Modals/Modals';
import * as PulsarGrpcClient from '../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../../../app/contexts/Notifications';
import Button from '../../../../../ui/Button/Button';
import { H3 } from '../../../../../ui/H/H';
import Input from '../../../../../ui/Input/Input';
import ActionButton from '../../../../../ui/ActionButton/ActionButton';
import Filter from '../Filter';
import * as t from '../types';
import { swrKeys } from '../../../../../swrKeys';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';

import deleteIcon from '../icons/delete.svg';
import createIcon from '../icons/create.svg';
import duplicateIcon from '../icons/duplicate.svg';
import editIcon from '../icons/edit.svg';

import s from './FiltersEditor.module.css';

type Props = {
  entry?: string,
  filters: Record<string, t.ChainEntry>,
  onChange: (f: Record<string, t.ChainEntry>) => void,
}

export type EditorFilter = t.Filter & {
  name: string,
  description: string,
}

type ChainEntry = {
  filter: EditorFilter,
}

type Collection = {
  name: string,
  description: string,
  filters: Record<string, ChainEntry>,
}

type CollectionsFilters = {
  [collection: string]: Collection,
}

type LibraryItem = 'message_filter' | 'consumer_session_config' | 'messages_visualization_config' | 'producer_config';
type Requirement = 'app_version' | 'npm_package';

const FiltersEditor = (props: Props) => {

  const [activeCollection, setActiveCollection] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [listFilters, setListFilters] = useState<CollectionsFilters>({});
  const [usedFilters, setUsedFilters] = useState(props.filters);
  const [newFilter, setNewFilter] = useState({ name: 'new filter', description: '' });
  const [renameCollection, setRenameCollection] = useState<string | undefined>();

  const { notifyError } = Notifications.useContext();
  const { libraryServiceClient } = PulsarGrpcClient.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.filters._();

  const libraryItemFromPb = (libraryItemPb: pb.LibraryItemType): LibraryItem  => {
    switch (libraryItemPb) {
      case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG: return 'consumer_session_config';
      case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGES_VISUALIZATION_CONFIG: return 'messages_visualization_config';
      case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER: return 'message_filter';
      case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_CONFIG: return 'producer_config';
      default: throw new Error(`Unknown library item: ${libraryItemPb}`);
    }
  }
  const libraryItemToPb = (value: LibraryItem): pb.LibraryItemType => {
    switch (value) {
      case 'consumer_session_config':
        return pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG;
      case 'messages_visualization_config':
        return pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGES_VISUALIZATION_CONFIG;
      case 'message_filter':
        return pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER;
      case 'producer_config':
        return pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_CONFIG;
    }
  }

  // const requirementFromPb = (requirementPb: pb.RequirementType): Requirement => {
  //   switch (requirementPb) {
  //     case pb.RequirementType.REQUIREMENT_TYPE_APP_VERSION: return 'app_version';
  //     case pb.RequirementType.REQUIREMENT_TYPE_NPM_PACKAGE: return 'npm_package';
  //     default: throw new Error(`Unknown requirement item: ${requirementPb}`);
  //   }
  // }
  // const requirementToPb = (value: Requirement): pb.RequirementType => {
  //   switch (value) {
  //     case 'app_version':
  //       return pb.RequirementType.REQUIREMENT_TYPE_APP_VERSION;
  //     case 'npm_package':
  //       return pb.RequirementType.REQUIREMENT_TYPE_NPM_PACKAGE;
  //   }
  // }

  const { data: collections, error: getCollectionsError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.ListCollectionsRequest();
      const res = await libraryServiceClient.listCollections(req, {});

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get list collections: ${res.getStatus()?.getMessage()}`);
      }

      const collectionsList = res.getCollectionsList();
      let collections: CollectionsFilters = {};

      collectionsList.map(collection => {
        const id = collection.getId();

        collections[id] = {
          name: collection.getName(),
          description: collection.getDescription(),
          filters: {},
        }
      });

      Object.keys(collections).map(async (collection) => {
        const req = new pb.ListLibraryItemsRequest();
        req.setCollectionId(collection);
        req.setItemsType(libraryItemToPb('message_filter'));
        const res = await libraryServiceClient.listLibraryItems(req, {});
        res.getLibraryItemsList().map(item => {
          const id = item.getId();
          collections[collection].filters[id] = {
            filter: {
              name: item.getName(),
              description: item.getDescription(),
              value: item.getMessageFilter()?.getCode(),
            }
          }
        })
      })

      setListFilters(collections);
      return collections;
    }
  );

  useEffect(() => console.log(listFilters), [listFilters])

  const useFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilter: string = listFilters[activeCollection].filters[activeFilter].filter.value || '';
    const newChain: Record<string, t.ChainEntry> = { ...usedFilters,  [uuid()]: { filter: { value: newFilter } } };
    props.onChange(newChain);
    setUsedFilters(newChain);
  }

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

    setActiveCollection(undefined);
    setActiveFilter(undefined);
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

  const onCreateFilter = async () => {
    if (!activeCollection) {
      return;
    }

    const req = new pb.CreateLibraryItemRequest();
    const libraryItem = new pb.LibraryItem();

    libraryItem.setName("New library item");
    libraryItem.setDescription("Description");
    libraryItem.setVersion("v1-beta");
    libraryItem.setSchemaVersion("v1-beta");

    const accessConfig = new pb.AccessConfig();
    accessConfig.setTopicPatternsList(['']);
    accessConfig.setUserReadRolesList(['']);
    accessConfig.setUserWriteRolesList(['']);
    libraryItem.setAccessConfig(accessConfig);

    const requirement = new pb.Requirement();

    const requir = true;
    if (requir) {
      const npmPackage = new pb.NpmPackageRequirement();
      npmPackage.setScope("Scope");
      npmPackage.setPackageName("Package-1");
      npmPackage.setVersion("v1-beta");
      requirement.setNpmPackage(npmPackage);
    } else {
      // requirement.setAppVersion("v1-beta");
    } 

    libraryItem.setRequirementsList([requirement]);

    type ItemTypes = 'messageFilter' | 'consumerSessionConfig' | 'messageVizualizationConfig' | 'producerConfig';
    let itemType: ItemTypes = 'messageFilter';
    switch (itemType) {
      case 'messageFilter':
        const messageFilter = new pb.LibraryItemMessageFilter();
        messageFilter.setCode("");
        libraryItem.setMessageFilter(messageFilter);    
        break;
      // case 'consumerSessionConfig':
      //   const consumerSessionConfig = new pb.LibraryItemConsumerSessionConfig();
      //   libraryItem.setConsumerSessionConfig(consumerSessionConfig);
      //   break;
      // case 'messageVizualizationConfig':
      //   const messageVizualizationConfig = new pb.LibraryItemMessagesVisualizationConfig();
      //   libraryItem.setMessagesVisualizationConfig(messageVizualizationConfig);
      //   break;
      // case 'producerConfig':
      //   const producerConfig = new pb.LibraryItemProducerConfig();
      //   libraryItem.setProducerConfig(producerConfig);
      //   break;
    }

    req.setLibraryItem(libraryItem);
    req.setCollectionId(activeCollection);
    const res = await libraryServiceClient.createLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create filter: ${res.getStatus()?.getMessage()}`);
    }

    setActiveFilter(undefined);
    await mutate(swrKey);
  }

  const onDuplicateFilter = async () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const req = new pb.CreateLibraryItemRequest();
    const libraryItem = new pb.LibraryItem();

    libraryItem.setName(listFilters[activeCollection].filters[activeFilter].filter.name);
    libraryItem.setDescription(listFilters[activeCollection].filters[activeFilter].filter.description);
    libraryItem.setVersion("v1-beta");
    libraryItem.setSchemaVersion("v1-beta");

    const accessConfig = new pb.AccessConfig();
    accessConfig.setTopicPatternsList(['']);
    accessConfig.setUserReadRolesList(['']);
    accessConfig.setUserWriteRolesList(['']);
    libraryItem.setAccessConfig(accessConfig);

    const requirement = new pb.Requirement();

    const requir = true;
    if (requir) {
      const npmPackage = new pb.NpmPackageRequirement();
      npmPackage.setScope("Scope");
      npmPackage.setPackageName("Package-1");
      npmPackage.setVersion("v1-beta");

      requirement.setNpmPackage(npmPackage);
    } else {
      // requirement.setAppVersion("v1-beta");
    } 

    libraryItem.setRequirementsList([requirement]);

    type ItemTypes = 'messageFilter' | 'consumerSessionConfig' | 'messageVizualizationConfig' | 'producerConfig';
    let itemType: ItemTypes = 'messageFilter';
    switch (itemType) {
      case 'messageFilter':
        const messageFilter = new pb.LibraryItemMessageFilter();
        messageFilter.setCode(listFilters[activeCollection].filters[activeFilter].filter.value || "");
        libraryItem.setMessageFilter(messageFilter);    
        break;
      // case 'consumerSessionConfig':
      //   const consumerSessionConfig = new pb.LibraryItemConsumerSessionConfig();
      //   libraryItem.setConsumerSessionConfig(consumerSessionConfig);
      //   break;
      // case 'messageVizualizationConfig':
      //   const messageVizualizationConfig = new pb.LibraryItemMessagesVisualizationConfig();
      //   libraryItem.setMessagesVisualizationConfig(messageVizualizationConfig);
      //   break;
      // case 'producerConfig':
      //   const producerConfig = new pb.LibraryItemProducerConfig();
      //   libraryItem.setProducerConfig(producerConfig);
      //   break;
    }

    req.setLibraryItem(libraryItem);
    req.setCollectionId(activeCollection);
    const res = await libraryServiceClient.createLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to duplicate filter: ${res.getStatus()?.getMessage()}`);
    }

    setActiveFilter(undefined);
    await mutate(swrKey);
  }

  const onSaveFilter = async () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const req = new pb.UpdateLibraryItemRequest();
    const libraryItem = new pb.LibraryItem();

    libraryItem.setId(activeFilter);
    libraryItem.setName(listFilters[activeCollection].filters[activeFilter].filter.name);
    libraryItem.setDescription(listFilters[activeCollection].filters[activeFilter].filter.description);
    libraryItem.setVersion("v1-beta");
    libraryItem.setSchemaVersion("v1-beta");

    const accessConfig = new pb.AccessConfig();
    accessConfig.setTopicPatternsList(['']);
    accessConfig.setUserReadRolesList(['']);
    accessConfig.setUserWriteRolesList(['']);
    libraryItem.setAccessConfig(accessConfig);

    const requirement = new pb.Requirement();

    const requir = true;
    if (requir) {
      const npmPackage = new pb.NpmPackageRequirement();
      npmPackage.setScope("Scope");
      npmPackage.setPackageName("Package-1");
      npmPackage.setVersion("v1-beta");

      requirement.setNpmPackage(npmPackage);
    } else {
      // requirement.setAppVersion("v1-beta");
    } 

    libraryItem.setRequirementsList([requirement]);

    type ItemTypes = 'messageFilter' | 'consumerSessionConfig' | 'messageVizualizationConfig' | 'producerConfig';
    let itemType: ItemTypes = 'messageFilter';
    switch (itemType) {
      case 'messageFilter':
        const messageFilter = new pb.LibraryItemMessageFilter();
        messageFilter.setCode(listFilters[activeCollection].filters[activeFilter].filter.value || "");
        libraryItem.setMessageFilter(messageFilter);    
        break;
      // case 'consumerSessionConfig':
      //   const consumerSessionConfig = new pb.LibraryItemConsumerSessionConfig();
      //   libraryItem.setConsumerSessionConfig(consumerSessionConfig);
      //   break;
      // case 'messageVizualizationConfig':
      //   const messageVizualizationConfig = new pb.LibraryItemMessagesVisualizationConfig();
      //   libraryItem.setMessagesVisualizationConfig(messageVizualizationConfig);
      //   break;
      // case 'producerConfig':
      //   const producerConfig = new pb.LibraryItemProducerConfig();
      //   libraryItem.setProducerConfig(producerConfig);
      //   break;
    }

    req.setLibraryItem(libraryItem);
    const res = await libraryServiceClient.updateLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update filter: ${res.getStatus()?.getMessage()}`);
    }

    setActiveFilter(undefined);
    
    await mutate(swrKey);
  }

  const onDeleteFilter = async () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const req = new pb.DeleteLibraryItemRequest();
    req.setId(activeFilter);
    req.setCollectionId(activeCollection);

    const res = await libraryServiceClient.deleteLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete filter: ${res.getStatus()?.getMessage()}`);
    }

    setActiveFilter(undefined);

    await mutate(swrKey);
  }

  const onChangeFilter = (value: EditorFilter) => {
    if (activeFilter === undefined || !activeCollection) {
      return;
    }

    const newFilters = cloneDeep(listFilters);
    newFilters[activeCollection].filters[activeFilter].filter = value;

    setListFilters(newFilters);
  }

  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`} key={stringify(collections)}>

        <div className={`${s.Column}`}>
          <div className={`${s.Collections}`}>
            <H3>
              Collections
            </H3>
            {Object.keys(listFilters).map(collection => (
              <span
                key={collection}
                onClick={() => {setActiveCollection(collection), setActiveFilter(undefined)}}
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

        <div className={`${s.Column}`}>
          <div className={`${s.Filters}`}>
            <H3>
              Filters
            </H3>
            {activeCollection && listFilters[activeCollection].filters &&
              Object.keys(listFilters[activeCollection].filters).map(filter => (
                <span
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                  }}
                  className={`${s.Inactive} ${activeFilter === filter && s.Active} ${filter.length === 0 && s.Empty}`}
                >
                  {listFilters[activeCollection].filters[filter].filter.name}
                  {listFilters[activeCollection].filters[filter].filter.name.length === 0 && 'write filter name'}
                </span>
              ))
            }
          </div>
          <div className={`${s.Buttons}`}>
            <Button
              svgIcon={deleteIcon}
              onClick={() => onDeleteFilter()}
              type="danger"
              title="Delete filter"
              disabled={!activeFilter}
            />
            <Button
              svgIcon={duplicateIcon}
              onClick={() => onDuplicateFilter()}
              type="primary"
              title="Duplicate filter"
              disabled={!activeFilter}
            />
            <Button
              svgIcon={createIcon}
              onClick={() => onCreateFilter()}
              type='primary'
              title="Create filter"
              disabled={!activeCollection}
            />
          </div>
        </div>

        <div className={`${s.Column}`}>
          <H3>
            Filter info
          </H3>
          {activeFilter && activeCollection && listFilters[activeCollection].filters[activeFilter] ?
            <>
              <span>Name</span>
              <Input
                value={listFilters[activeCollection].filters[activeFilter].filter.name}
                onChange={(value) =>  onChangeFilter({ ...listFilters[activeCollection].filters[activeFilter].filter, name: value })}
                placeholder="message-filter"
              />
              <span>Description</span>
              <Input
                value={listFilters[activeCollection].filters[activeFilter].filter.description || ''}
                onChange={(value) =>  onChangeFilter({ ...listFilters[activeCollection].filters[activeFilter].filter, description: value })}
                placeholder="useful filter"
              />
            </> :
            <span>
              Choose filter
            </span>
          }
        </div>
        {props.entry &&
          <div className={`${s.Column}`}>
            <H3>
              New filter info
            </H3>
            <span>Name</span>
            <Input
              value={newFilter.name}
              onChange={(value) => setNewFilter({...newFilter, name: value})}
              placeholder="message-filter"
            />
            <span>Description</span>
            <Input
              value={newFilter.description}
              onChange={(value) => setNewFilter({...newFilter, description: value})}
              placeholder="useful filter"
            />
          </div>
        }

        {!props.entry &&
          <div className={`${s.Column} ${s.JsonEditor}`} key={`${activeCollection}-${activeFilter}`}>
            <H3>
              Json code editor
            </H3>
            {activeFilter && activeCollection ?
              <Filter
                value={listFilters[activeCollection].filters[activeFilter].filter}
                onChange={(value) =>  onChangeFilter({ ...listFilters[activeCollection].filters[activeFilter].filter, ...value })}
              /> :
              <span>
                Choose filter
              </span>
            }
          </div>
        }

      </div>
      <div className={s.MainButtons}>
        <Button
          type='primary'
          text='Save'
          // onClick={() => {props.entry ? onSaveFilter() : onUpdateCollection({})}}
          onClick={() => onSaveFilter()}
        />
        {!props.entry &&
          <Button
            type='primary'
            text='Use'
            onClick={() => useFilter()}
          />
        }
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor;