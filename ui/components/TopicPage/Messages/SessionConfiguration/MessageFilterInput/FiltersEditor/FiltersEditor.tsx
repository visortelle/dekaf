import React, { useState } from 'react';
import _, { cloneDeep } from 'lodash';
import useSWR, { useSWRConfig } from "swr";
import { v4 as uuid } from 'uuid';

import { DefaultProvider } from '../../../../../app/contexts/Modals/Modals';
import * as PulsarGrpcClient from '../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../../../app/contexts/Notifications';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import Input from '../../../../../ui/Input/Input';
import Filter from '../Filter';
import * as t from '../types';
import { swrKeys } from '../../../../../swrKeys';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import Collections from './Collections/Collections';
import Filters from './Filters/Filters';
import MainButtons from './MainButtons/MainButtons';

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

type AccessConfig = {
  userReadRoles: string[],
  userWriteRoles: string[],
  topicPatterns: string[],
}

type NpmPackage = {
  scope: string,
  packageName: string,
  version: string,
}

type AppVersion = {
  version: string,
}

type Requirement = NpmPackage | AppVersion

type MessageFilter = {
  code: string,
}

type ChainEntry = {
  filter: EditorFilter,
  schemaVersion: string,
  version: string,
  accessConfig: AccessConfig,
  requirements: Requirement[],
  libraryItem: MessageFilter,
}

type Collection = {
  name: string,
  description: string,
  filters: Record<string, ChainEntry>,
}

export type CollectionsFilters = {
  [collection: string]: Collection,
}

type LibraryItem = 'message_filter' | 'consumer_session_config' | 'messages_visualization_config' | 'producer_config';

const FiltersEditor = (props: Props) => {

  const [activeCollection, setActiveCollection] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [listFilters, setListFilters] = useState<CollectionsFilters>({});
  const [usedFilters, setUsedFilters] = useState(props.filters);

  const { notifyError } = Notifications.useContext();
  const { libraryServiceClient } = PulsarGrpcClient.useContext();
  const { mutate } = useSWRConfig();
  const modals = Modals.useContext();

  const swrKey = swrKeys.pulsar.library.filters._();

  // const libraryItemFromPb = (libraryItemPb: pb.LibraryItemType): LibraryItem  => {
  //   switch (libraryItemPb) {
  //     case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG: return 'consumer_session_config';
  //     case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGES_VISUALIZATION_CONFIG: return 'messages_visualization_config';
  //     case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER: return 'message_filter';
  //     case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_CONFIG: return 'producer_config';
  //     default: throw new Error(`Unknown library item: ${libraryItemPb}`);
  //   }
  // }
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

      await Promise.all(collectionsList.map(async collection => {
        const id = collection.getId();
        const req = new pb.ListLibraryItemsRequest();

        req.setCollectionId(id);
        req.setItemsType(libraryItemToPb('message_filter'));

        const res = await libraryServiceClient.listLibraryItems(req, {});
        
        let filters: Record<string, ChainEntry> = {};
        const _ = res.getLibraryItemsList().map(item => {
          const id = item.getId();
          const requirements = item.getRequirementsList().map(requirement => {
            if (requirement.getAppVersion()) {
              return { version: requirement.getAppVersion()?.toString() || '' }
            } else {
              return {
                scope: requirement.getNpmPackage()?.getScope() || '',
                version: requirement.getNpmPackage()?.getVersion() || '',
                packageName: requirement.getNpmPackage()?.getPackageName() || ''
              }
            }
          })

          filters[id] = {
            filter: {
              name: item.getName(),
              description: item.getDescription(),
              value: item.getMessageFilter()?.getCode(),
            },
            schemaVersion: item.getSchemaVersion(),
            version: item.getVersion(),
            accessConfig: {
              userReadRoles: item.getAccessConfig()?.getUserReadRolesList() || [],
              userWriteRoles: item.getAccessConfig()?.getUserWriteRolesList() || [],
              topicPatterns: item.getAccessConfig()?.getTopicPatternsList() || []},
            requirements: requirements,
            libraryItem: { code: item.getLibraryItemCase().toString()}, 
          }
        })

        collections[id] = {
          name: collection.getName(),
          description: collection.getDescription(),
          filters: filters,
        }
      }));

      if (props.entry != undefined && activeCollection) {
        const newFilterId = uuid().toString();

        collections[activeCollection].filters[newFilterId] = {
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
        setActiveFilter(newFilterId)
      }

      setListFilters(collections);
      return collections;
    }
  );

  const onCreateFilter = async (filled?: boolean) => {
    if (!activeCollection) {
      return;
    }

    const req = new pb.CreateLibraryItemRequest();
    const libraryItem = new pb.LibraryItem();

    libraryItem.setName(filled && activeFilter ? listFilters[activeCollection].filters[activeFilter].filter.name : "New library item");
    libraryItem.setDescription(filled && activeFilter ? listFilters[activeCollection].filters[activeFilter].filter.description : "Description");
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

    const messageFilter = new pb.LibraryItemMessageFilter();
    messageFilter.setCode(filled && activeFilter && listFilters[activeCollection].filters[activeFilter].filter.value || "");
    libraryItem.setMessageFilter(messageFilter);

    req.setLibraryItem(libraryItem);
    req.setCollectionId(activeCollection);
    const res = await libraryServiceClient.createLibraryItem(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create filter: ${res.getStatus()?.getMessage()}`);
    }

    filled && modals.pop();

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
      <div className={`${s.FiltersEditor}`}>

        <Collections
          activeCollection={activeCollection}
          activeFilter={activeFilter}
          listFilters={listFilters}
          setActiveCollection={setActiveCollection}
          setActiveFilter={setActiveFilter}
          setListFilters={setListFilters}
        />

        {/* Filters */}
        <Filters
          activeCollection={activeCollection}
          activeFilter={activeFilter}
          listFilters={listFilters}
          setActiveFilter={setActiveFilter}
          onCreateFilter={onCreateFilter}
        />

        <div className={`${s.Column}`}>
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

        <div className={`${s.Column} ${s.JsonEditor}`} key={`${activeCollection}-${activeFilter}`}>
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

      </div>

      <MainButtons
        entry={props.entry}
        activeCollection={activeCollection}
        activeFilter={activeFilter}
        listFilters={listFilters}
        usedFilters={usedFilters}
        onChange={props.onChange}
        onCreateFilter={onCreateFilter}
        setUsedFilters={setUsedFilters}
      />

    </DefaultProvider>
  )
}

export default FiltersEditor;