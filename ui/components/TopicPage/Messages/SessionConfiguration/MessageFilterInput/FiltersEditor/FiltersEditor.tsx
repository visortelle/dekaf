import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';

import { DefaultProvider } from '../../../../../app/contexts/Modals/Modals';
import Button from '../../../../../ui/Button/Button';
import { H3 } from '../../../../../ui/H/H';
import Input from '../../../../../ui/Input/Input';
import ActionButton from '../../../../../ui/ActionButton/ActionButton';
import Filter, { defaultJsValue } from '../Filter';
import * as t from '../types';

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
  description: string,
  name: string,
}

type ChainEntry = {
  filter: EditorFilter,
}

type Collection = {
  name: string,
  filters: Record<string, ChainEntry>,
}

type ListFilters = {
  [collection: string]: Collection,
}

const FiltersEditor = (props: Props) => {

  const [activeCollection, setActiveCollection] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [listFilters, setListFilters] = useState<ListFilters>({});
  const [usedFilters, setUsedFilters] = useState(props.filters);
  const [newFilter, setNewFilter] = useState({ name: 'new filter', description: '' });
  const [renameCollection, setRenameCollection] = useState<string | undefined>();

  useEffect(() => {
    const filters = localStorage.getItem('messageFilters');

    if (filters) {
      setListFilters(JSON.parse(filters));
    }
  }, []);

  const useFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilter: string = listFilters[activeCollection].filters[activeFilter].filter.value || '';
    const newChain: Record<string, t.ChainEntry> = { ...usedFilters,  [uuid()]: { filter: { value: newFilter } } };
    props.onChange(newChain);
    setUsedFilters(newChain);
  }

  const onSave = () => {
    console.log(listFilters)
    localStorage.setItem('messageFilters', JSON.stringify(listFilters));
  }

  const onSaveNewFilter = () => {
    if (!props.entry || !activeCollection || !listFilters[activeCollection].filters) {
      return;
    }
    const newFilterId = uuid();
    const chainClone = cloneDeep(listFilters);

    chainClone[activeCollection].filters[newFilterId] = {filter: { ...newFilter, value: props.entry }}


    localStorage.setItem(
      'messageFilters',
      JSON.stringify(chainClone)
    );
  }

  const onDuplicateFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);
    const newFilter = uuid();

    newFilters.filters[newFilter] = cloneDeep(newFilters.filters[activeFilter]);
    newFilters.filters[newFilter].filter.name += '-duplicate';
    setListFilters({ ...listFilters, [activeCollection]: newFilters });
    setActiveFilter(newFilter);
  }

  const createNewFilter = () => {
    if (!activeCollection) {
      return;
    }
    
    const newFilter = uuid();
    const withNewFilter = cloneDeep(listFilters);

    withNewFilter[activeCollection].filters[newFilter] = {filter: { description: '', value: defaultJsValue, name: 'new filter' }}

    setListFilters(withNewFilter);
    setActiveFilter(newFilter);
  }

  const onDeleteFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);
    delete newFilters.filters[activeFilter];

    setListFilters({ ...listFilters, [activeCollection]: newFilters });
    setActiveFilter(undefined);
  }

  const onCreateNewCollection = () => {
    const newCollection = uuid();
    setListFilters({ ...listFilters, [newCollection]: {
      name: 'new collection',
      filters: {},
    }})

    setActiveCollection(newCollection);
  }

  const onDuplicateCollection = () => {
    if (!activeCollection) {
      return;
    }

    const newCollections = cloneDeep(listFilters);
    const newCollection = uuid();

    newCollections[newCollection] = cloneDeep(newCollections[activeCollection]);
    newCollections[newCollection].name += '-duplicate';
    setListFilters(newCollections);
    setActiveCollection(newCollection);
  }

  const onDeleteCollection = () => {
    if (!activeCollection) {
      return;
    }

    const newFilters = cloneDeep(listFilters);
    delete newFilters[activeCollection];

    setListFilters(newFilters);
    setActiveCollection(undefined);
    setActiveFilter(undefined);
  }

  const onChangeFilter = (value: EditorFilter) => {
    if (activeFilter === undefined || !activeCollection) {
      return;
    }

    const newFilters = cloneDeep(listFilters);
    newFilters[activeCollection].filters[activeFilter].filter = value;

    setListFilters(newFilters);
  }

  const onRenameCollection = () => {
    if (!activeCollection || !renameCollection) {
      return;
    }

    const newCollections = cloneDeep(listFilters);

    newCollections[activeCollection].name = renameCollection;
    setListFilters(newCollections);
    setActiveCollection(renameCollection)
  }

  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`}>

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
              onClick={() => onCreateNewCollection()}
              type='primary'
              title="Create collection"
            />

            <Button
              svgIcon={editIcon}
              onClick={() => setRenameCollection(activeCollection)}
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
                    onClick={() => setRenameCollection(activeCollection)}
                    disabled={renameCollection === activeCollection}
                    text="Reset"
                  />
                  <Button
                    type="primary"
                    onClick={() => onRenameCollection()}
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
              onClick={() => createNewFilter()}
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
                onChange={(value) =>  onChangeFilter({ ...listFilters[activeCollection].filters[activeFilter].filter, value })}
                placeholder="message-filter"
              />
              <span>Description</span>
              <Input
                value={listFilters[activeCollection].filters[activeFilter].filter.description || ''}
                onChange={(value) =>  onChangeFilter({ ...listFilters[activeCollection].filters[activeFilter].filter, value })}
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
          onClick={() => {props.entry ? onSaveNewFilter() : onSave()}}
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