import React, {useEffect, useRef, useState} from 'react';
import {cloneDeep, isEqual} from 'lodash';
import {v4 as uuid} from 'uuid';

import {DefaultProvider} from '../../../../../app/contexts/Modals/Modals';
import Button from '../../../../../ui/Button/Button';
import {H3} from '../../../../../ui/H/H';
import Input from '../../../../../ui/Input/Input';
import ActionButton from '../../../../../ui/ActionButton/ActionButton';
import Filter from '../Filter';
import * as t from '../types';

import deleteIcon from '../icons/delete.svg';
import createIcon from '../icons/create.svg';
import duplicateIcon from '../icons/duplicate.svg';
import editIcon from '../icons/edit.svg';

import s from './FiltersEditor.module.css';
import useSWR, {mutate} from "swr";
import {swrKeys} from "../../../../../swrKeys";
import {
  DeleteMessageFilterCollectionRequest,
  DeleteMessageFilterRequest,
  GetFiltersCollectionsRequest,
  RawFiltersCollection,
  SaveRawFiltersCollectionRequest,
  UpdateExistingFilterCollectionRequest
} from "../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {Code} from "../../../../../../grpc-web/google/rpc/code_pb";
import * as GrpcClient from "../../../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../../../app/contexts/Notifications";
import {collectionFromPb, collectionToPb, filterToPb} from "../conversions";
import {defaultFilter} from "../FilterChain";
import NothingToShow from "../../../../../ui/NothingToShow/NothingToShow";
import ScopeTree from "./ScopeTree/ScopeTree";
import {TopicNode} from "../../../Message/ReprocessMessage/types";


type Props = {
  filters: Record<string, t.ChainEntry>,
  topicNode: TopicNode,
  onChange: (f: Record<string, t.ChainEntry>) => void,
  onDone: () => void,
}

type EditorCollection = t.Collection & {
  filtersChain: Record<string, t.ChainEntry>,
}

const FiltersEditor = (props: Props) => {
  const { notifyError, notifyInfo, notifySuccess } = Notifications.useContext();
  const {consumerServiceClient} = GrpcClient.useContext();
  const [activeCollectionId, setActiveCollectionId] = useState<string>();
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [usedFilters, setUsedFilters] = useState(props.filters);
  const [newFilter, setNewFilter] = useState({ name: 'new filter', description: '' });
  const [renameCollection, setRenameCollection] = useState<string | undefined>();
  const prevSwrEditorCollections = useRef<Record<string, EditorCollection>>();
  const [editorCollections, setEditorCollections] = useState<Record<string, EditorCollection> | undefined>();

  const {data: swrEditorCollections, error: swrEditorCollectionsError, isLoading: swrEditorCollectionsIsLoading} =
    useSWR(
      swrKeys.pulsar.batch.getFiltersCollections,
      async () => {
        const req = new GetFiltersCollectionsRequest();

        const res = await consumerServiceClient.getFiltersCollections(req, null)
          .catch(err => notifyError("Unable to get filters collections. Error: ", err));

        if (!res) {
          return;
        }

        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to get filters collections. ${res.getStatus()?.getMessage()}`);
          return;
        }

        prevSwrEditorCollections.current = swrEditorCollections;

        const collections = res.getFiltersCollectionsList().map(collectionFromPb);

        const collectionsWithAppliedScope = collections.map(collection => {
          return {
            ...collection,
            filters: Object.fromEntries(
              Object.entries(collection.filters).filter(([, filter]) => {
                const filterScope = filter.scope || {};
                const isTenantCompatible = isEqual(filterScope.tenant, props.topicNode.tenant) && !filterScope.namespace && !filterScope.topicName;
                const isNamespaceCompatible = (isEqual(filterScope.tenant, props.topicNode.tenant) && isEqual(filterScope.namespace, props.topicNode.namespace)) || !filterScope.topicName;
                const isTopicCompatible = isEqual(filterScope.tenant, props.topicNode.tenant) && isEqual(filterScope.namespace, props.topicNode.namespace) && isEqual(filterScope.topicName, props.topicNode.topicName);

                return (
                  (isTopicCompatible || isNamespaceCompatible || isTenantCompatible) ||
                  (!filterScope.tenant && !filterScope.namespace && !filterScope.topicName)
                );
              })
            ),
          };
        });


        return collectionsWithAppliedScope
            .reduce((acc, collection) => {
              acc[collection.id] = {
                ...collection,
                filtersChain: Object.keys(collection.filters).reduce((acc, key) => {
                  acc[key] = {filter: collection.filters[key]};
                  return acc;
                }, {} as Record<string, t.ChainEntry>)
              }
              return acc;
            }, {} as Record<string, EditorCollection>);
      }
    );

  useEffect(() => {
    if (swrEditorCollections) {
      setEditorCollections((prevEditorCollection) => {
        if (prevEditorCollection) {

          // New state by excluding previous swr data and adding new swr data to existing state
          const newState = Object.entries(prevEditorCollection)
              .reduce((acc, [key, editorCollection]) => {
                if (!prevSwrEditorCollections.current![key]) {
                  acc[key] = editorCollection;
                }
                return acc;
              }, {} as Record<string, EditorCollection>);


          return {...swrEditorCollections, ...newState};
        } else {
          return swrEditorCollections;
        }

      });
    }
  }, [swrEditorCollections]);

  const useCollection = () => {
    if (!activeCollectionId || !editorCollections || !editorCollections[activeCollectionId]) {
      return;
    }

    props.onChange(editorCollections[activeCollectionId].filtersChain);
    setUsedFilters(editorCollections[activeCollectionId].filtersChain);
  }

  const useFilter = () => {
    if (!activeCollectionId || !activeFilterId || !editorCollections || !editorCollections[activeCollectionId]) {
      return;
    }

    const newFilter = editorCollections[activeCollectionId].filters[activeFilterId];
    const newChain: Record<string, t.ChainEntry> = { ...usedFilters,  [uuid()]: { filter: newFilter } };
    props.onChange(newChain);
    setUsedFilters(newChain);
  }

  const updateExistingCollection = async (editorCollection: EditorCollection) => {
    const req = new UpdateExistingFilterCollectionRequest();

    const rawFiltersCollection = new RawFiltersCollection();
    rawFiltersCollection.setCollectionId(editorCollection.id);
    rawFiltersCollection.setCollectionName(editorCollection.name);
    Object.entries(editorCollection.filters)
      .forEach(([id, filter]) =>
        rawFiltersCollection.getFiltersMapMap().set(id, filterToPb(filter))
      );

    req.setRawCollection(rawFiltersCollection);

    const res = await consumerServiceClient.updateExistingFilterCollection(req, null)
      .catch(err => notifyError(`Unable to save collection. Collection: ${editorCollection.id}. Error: ${err}`));

    if(!res) {
      notifyError(`Unable to save collection due to server problem. Collection: ${editorCollection.id}.`)
      return;
    }

    if(res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save collection. Collection: ${editorCollection.id}. Error: ${res.getStatus()?.getMessage()}`)
      return;
    }
  };

  const saveAsNewCollection = async (editorCollection: EditorCollection) => {
    const req = new SaveRawFiltersCollectionRequest();
    req.setRawCollection(collectionToPb(editorCollection));

    const res = await consumerServiceClient.saveRawFiltersCollection(req, null)
      .catch(err => notifyError(`Unable to save collection. Collection: ${editorCollection.id}. Error: ${err}`));

    if(!res) {
      notifyError(`Unable to save collection due to server problem. Collection: ${editorCollection.id}.`)
      return;
    }

    if(res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save collection. Collection: ${editorCollection.name}. Error: ${res.getStatus()?.getMessage()}`)
      return;
    }
  }

  const onSave = async () => {
    if (!editorCollections || !swrEditorCollections) {
      notifyInfo("No collections to save.");
      return;
    }

    //await mutate(swrKeys.pulsar.batch.getFiltersCollections);

    const promises = Object.entries(editorCollections).map(async ([id, editorCollection]) => {
      if (swrEditorCollections[id] && !isEqual(swrEditorCollections[id], editorCollection)) {
        return updateExistingCollection(editorCollection);
      }
      return;
    });

    await Promise.all(promises);
    notifySuccess(`Changes saved successfully.`);
  }


  const onCreateNewFilter = async () => {
    if (!activeCollectionId) {
      notifyInfo("Please choose the collection to save to.");
      return;
    }

    if (!editorCollections) {
      notifyInfo("No collections to add filter to.");
      return;
    }

    const newFilterId = uuid();
    const collectionsWithNewFilter = cloneDeep(editorCollections);

    collectionsWithNewFilter[activeCollectionId].filters[newFilterId] = cloneDeep(defaultFilter)

    await updateExistingCollection(collectionsWithNewFilter[activeCollectionId]);

    setEditorCollections(collectionsWithNewFilter);
    setActiveFilterId(newFilterId);
  }

  const onDuplicateFilter = async () => {
    if (!activeCollectionId) {
      notifyInfo("Please choose the collection to duplicate filter to.");
      return;
    }

    if (!activeFilterId) {
      notifyInfo("Please choose the filter to duplicate.");
      return;
    }

    if (!editorCollections) {
        notifyInfo("No collections to duplicate filter to.");
        return;
    }

    const newCollection = cloneDeep(editorCollections[activeCollectionId]);
    const newFilterId = uuid();

    newCollection.filters[newFilterId] = cloneDeep(newCollection.filters[activeFilterId]);
    newCollection.filters[newFilterId].name += '-duplicate';

    await updateExistingCollection(newCollection);

    setEditorCollections(prevEditorCollections => ({ ...prevEditorCollections, [activeCollectionId]: newCollection }));
    setActiveFilterId(newFilterId);
  }

  const onDeleteFilter = async () => {
    if (!activeCollectionId) {
        notifyInfo("Please choose the collection to delete filter from.");
        return;
    }

    if(!activeFilterId) {
        notifyInfo("Please choose the filter to delete.");
        return;
    }

    if (!editorCollections) {
        notifyInfo("No collections to delete filter from.");
        return;
    }

    const deleteFilter = async (collection: EditorCollection, filterId: string) => {
      const filterName = collection.filters[filterId].name;
      const collectionName = collection.name;

      const req = new DeleteMessageFilterRequest();
      req.setCollectionId(collection.id);
      req.setFilterId(filterId);

      const res = await consumerServiceClient.deleteMessageFilter(req, null)
          .catch(err => notifyError(`Unable to delete filter. Collection: ${collectionName}. Filter: ${filterName}. Error: ${err}`));

        if(!res) {
            notifyError(`Unable to delete filter due to server problem. Collection: ${collectionName}. Filter: ${filterName}.`)
            return;
        }

        if(res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to delete filter. Collection: ${collection.name}. Filter: ${filterId}. Error: ${res.getStatus()?.getMessage()}`)
            return;
        }
    }

    const newCollection = cloneDeep(editorCollections[activeCollectionId]);
    if (swrEditorCollections && swrEditorCollections[activeCollectionId] && swrEditorCollections[activeCollectionId].filters[activeFilterId]) {
      await deleteFilter(newCollection, activeFilterId);
    }
    delete newCollection.filters[activeFilterId];

    setEditorCollections(prevEditorCollections => ({ ...prevEditorCollections, [activeCollectionId]: newCollection }));
    setActiveFilterId(undefined);
  }

  const createNewCollection = async (collection: EditorCollection) => {
    const req = new SaveRawFiltersCollectionRequest();
    req.setRawCollection(collectionToPb(collection));

    const res = await consumerServiceClient.saveRawFiltersCollection(req, null)
      .catch(err => notifyError(`Unable to create new collection. Collection: ${collection.name}. Error: ${err}`));

    if(!res) {
      notifyError(`Unable to create new collection due to server problem. Collection: ${collection.name}.`)
      return;
    }

    if(res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create new collection. Collection: ${collection.name}. Error: ${res.getStatus()?.getMessage()}`)
      return;
    }
  }

  const onCreateNewCollection = async () => {
    const newCollectionId = uuid();
    const newCollection: EditorCollection = {
      id: newCollectionId,
      name: 'New collection',
      filters: {},
      filtersChain: {}
    }

    await createNewCollection(newCollection);

    setEditorCollections(prevEditorCollections =>
      ({ ...prevEditorCollections, [newCollectionId]: newCollection })
    )
    setActiveCollectionId(newCollectionId);
    setActiveFilterId(undefined);
  }

  const onDuplicateCollection = async () => {
    if (!activeCollectionId) {
      notifyInfo("Please choose the collection to duplicate.");
      return;
    }

    if (!editorCollections) {
        notifyInfo("No collections to duplicate.");
        return;
    }

    const newCollections = cloneDeep(editorCollections);
    const newCollectionId = uuid();

    newCollections[newCollectionId] = cloneDeep(newCollections[activeCollectionId]);
    newCollections[newCollectionId].id = newCollectionId;
    newCollections[newCollectionId].name += '-duplicate';

    await createNewCollection(newCollections[newCollectionId]);

    setEditorCollections(newCollections);
    setActiveCollectionId(newCollectionId);
  }

  const onDeleteCollection = async () => {
    if (!activeCollectionId) {
        notifyInfo("Please choose the collection to delete.");
      return;
    }

    if (!editorCollections) {
        notifyInfo("No collections to delete.");
        return;
    }

    const deleteCollection = async (collection: EditorCollection) => {
      const collectionName = collection.name;

      const req = new DeleteMessageFilterCollectionRequest();
      req.setCollectionId(collection.id);

      const res = await consumerServiceClient.deleteMessageFilterCollection(req, null)
        .catch(err => notifyError(`Unable to delete filter. Collection: ${collectionName}. Error: ${err}`));

      if(!res) {
        notifyError(`Unable to delete filter due to server problem. Collection: ${collectionName}.`)
        return;
      }

      if(res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete filter. Collection: ${collection.name}. Error: ${res.getStatus()?.getMessage()}`)
        return;
      }
    }

    const newFilters = cloneDeep(editorCollections);

    if (swrEditorCollections && swrEditorCollections[activeCollectionId]) {
      await deleteCollection(editorCollections[activeCollectionId]);
    }
    delete newFilters[activeCollectionId];

    setEditorCollections(newFilters);
    setActiveCollectionId(undefined);
    setActiveFilterId(undefined);
  }

  const onChangeFilter = (value: t.Filter) => {
    if (!activeCollectionId) {
      notifyInfo("Please choose the collection to change filter in.");
      return;
    }

    if (!activeFilterId) {
      notifyInfo("Please choose the filter to change.");
      return;
    }

    if (!editorCollections) {
      notifyInfo("No collections to change filter in.");
      return;
    }

    const newFilters = cloneDeep(editorCollections);
    newFilters[activeCollectionId].filters[activeFilterId] = value;

    setEditorCollections(newFilters);
  }

  const onRenameCollection = async () => {
    if (!activeCollectionId) {
        notifyInfo("Please choose the collection to rename.");
      return;
    }

    if (!renameCollection) {
        notifyInfo("Please enter the new name for collection.");
        return;
    }

    if (!editorCollections) {
        notifyInfo("No collections to rename.");
        return;
    }

    const newCollections = cloneDeep(editorCollections);

    newCollections[activeCollectionId].name = renameCollection;

    await updateExistingCollection(newCollections[activeCollectionId]);

    setEditorCollections(newCollections);
    setActiveCollectionId(activeCollectionId)
  }

  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`}>

        <div className={`${s.Column}`}>
          <div className={`${s.Collections}`}>
            <H3>
              Collections
            </H3>
            {editorCollections ? (
                Object.keys(editorCollections)
                    .map(collectionId => (
                            <span
                                key={collectionId}
                                onClick={() => {
                                  setActiveCollectionId(collectionId);
                                  setActiveFilterId(undefined);
                                }}
                                className={`${s.Inactive} ${activeCollectionId === collectionId && s.Active}`}
                            >
                              {editorCollections[collectionId].name}
                           </span>
                        )
                    )
            ) : (
                <NothingToShow reason={'loading-in-progress'}/>
            )}
          </div>
          <div className={`${s.Buttons}`}>

            <Button
              svgIcon={deleteIcon}
              onClick={() => onDeleteCollection()}
              type="danger"
              title="Delete collection"
              disabled={!activeCollectionId}
            />
            <Button
              svgIcon={duplicateIcon}
              onClick={() => onDuplicateCollection()}
              type="primary"
              title="Duplicate collection"
              disabled={!activeCollectionId}
            />
            <Button
              svgIcon={createIcon}
              onClick={() => onCreateNewCollection()}
              type='primary'
              title="Create collection"
            />

            <Button
                svgIcon={editIcon}
                onClick={() =>
                    activeCollectionId &&
                    editorCollections &&
                    setRenameCollection(editorCollections[activeCollectionId].name)
                }
                type='regular'
                title="Rename collection"
                disabled={!activeCollectionId}
            />

            {renameCollection !== undefined && activeCollectionId && editorCollections &&
              <div className={s.RenameCollection}>
                <div className={s.HeadRenameCollection}>
                  <span>
                    Rename collection
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
                    onClick={() => setRenameCollection(editorCollections[activeCollectionId].name)}
                    disabled={renameCollection === activeCollectionId}
                    text="Reset"
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      onRenameCollection();
                      setRenameCollection(undefined);
                    }}
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
            {activeCollectionId && editorCollections && editorCollections[activeCollectionId] && editorCollections[activeCollectionId].filters &&
              Object.keys(editorCollections[activeCollectionId].filters).map(filter => (
                <span
                  key={filter}
                  onClick={() => {
                    setActiveFilterId(filter);
                  }}
                  className={`${s.Inactive} ${activeFilterId === filter && s.Active} ${filter.length === 0 && s.Empty}`}
                >
                  {editorCollections[activeCollectionId].filters[filter].name}
                  {editorCollections[activeCollectionId].filters[filter].name.length === 0 && 'undefined'}
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
              disabled={!activeFilterId}
            />
            <Button
              svgIcon={duplicateIcon}
              onClick={() => onDuplicateFilter()}
              type="primary"
              title="Duplicate filter"
              disabled={!activeFilterId}
            />
            <Button
              svgIcon={createIcon}
              onClick={() => onCreateNewFilter()}
              type='primary'
              title="Create filter"
              disabled={!activeCollectionId}
            />
          </div>
        </div>

        <div className={`${s.Column} ${s.FilterInfo}`}>
          <H3>
            Filter info
          </H3>
          {activeCollectionId && activeFilterId && editorCollections && editorCollections[activeCollectionId].filters[activeFilterId] ?
            <div className={s.FilterInfoFieldsWrapper}>
              <div className={s.FilterInfoField}>
                <span>Name</span>
                <Input
                  value={editorCollections[activeCollectionId].filters[activeFilterId].name}
                  onChange={(name) =>  onChangeFilter({ ...editorCollections[activeCollectionId].filters[activeFilterId], name: name })}
                  placeholder="New filter"
                />
              </div>
              <div className={s.FilterInfoField}>
                <span>Description</span>
                <Input
                  value={editorCollections[activeCollectionId].filters[activeFilterId].description || ''}
                  onChange={(description) =>  onChangeFilter({ ...editorCollections[activeCollectionId].filters[activeFilterId], description: description })}
                  placeholder="Some description"
                />
              </div>
              <div className={s.FilterInfoField}>
                <span>Scope</span>
                <ScopeTree
                  scope={editorCollections[activeCollectionId].filters[activeFilterId].scope ?? {
                    tenant: '',
                    namespace: '',
                    topicName: '',
                    topicType: 'persistent'
                  }}
                  setFilterScope={(scope) => onChangeFilter({ ...editorCollections[activeCollectionId].filters[activeFilterId], scope: scope })}
                />
              </div>
            </div> :
            <span>
              Choose filter
            </span>
          }
        </div>

        <div className={`${s.Column} ${s.JsonEditor}`} key={`${activeCollectionId}-${activeFilterId}`}>
          <H3>
            Json code editor
          </H3>
          {activeCollectionId && activeFilterId && editorCollections ? (
            <Filter
              value={editorCollections[activeCollectionId].filters[activeFilterId]}
              onChange={(value) => onChangeFilter({...editorCollections[activeCollectionId].filters[activeFilterId], ...value})}
            />
          ) : (
            <span>
              Choose filter
            </span>
          )
          }
        </div>

      </div>
      <div className={s.MainButtons}>
        <Button
            type='primary'
            text='Save'
            onClick={() => onSave()}
        />
        <Button
            type='primary'
            text='Use filter'
            onClick={() => {
              useFilter();
              props.onDone()
            }}
        />
        <Button
          type='primary'
          text='Use collection'
          onClick={() => {
            useCollection();
            props.onDone()
          }}
        />
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor;
