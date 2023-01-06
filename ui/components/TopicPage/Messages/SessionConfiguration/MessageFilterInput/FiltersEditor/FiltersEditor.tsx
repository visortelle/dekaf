import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';

import { DefaultProvider } from '../../../../../app/contexts/Modals/Modals';
import Button from '../../../../../ui/Button/Button';
import { H3 } from '../../../../../ui/H/H';
import Input from '../../../../../ui/Input/Input';
import Filter, { defaultJsValue } from '../Filter';
import * as t from '../types';

import s from './FiltersEditor.module.css';

type Props = {
  editableFilter?: string,
  filters: Record<string, t.ChainEntry>,
  onChange: (f: Record<string, t.ChainEntry>) => void,
}

type EditorFilter = t.Filter & {
  description: string;
  name: string;
}

type ChainEntry = {
  filter: EditorFilter;
}

type Collection = {
  name: string,
  filters: Record<string, ChainEntry>
}

type ListFilters = {
  [collection: string]: Collection
}

const FiltersEditor = (props: Props) => {

  const [activeCollection, setActiveCollection] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>(props.editableFilter);
  const [listFilters, setListFilters] = useState<ListFilters>({});
  const [usedFilters, setUsedFilters] = useState(props.filters);

  useEffect(() => {
    const filters = localStorage.getItem('messageFilters');

    if (filters) {
      setListFilters(JSON.parse(filters));
    }
  }, []);

  const onSave = () => {
    localStorage.setItem('messageFilters', JSON.stringify(listFilters));
  }

  const onChangeEntryName = (value: string) => {
    if (activeFilter === undefined || !activeCollection) {
      return
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);
    newFilters.filters[activeFilter].filter.name = value

    setListFilters({ ...listFilters, [activeCollection]: newFilters});
  }

  const onChangeDescription = (value: string) => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newDescription = cloneDeep(listFilters);
    newDescription[activeCollection].filters[activeFilter].filter.description = value

    // const newDescription = {
    //   ...listFilters,
    //   [activeCollection]: {
    //     ...listFilters[activeCollection],
    //     filters: {
    //       ...listFilters[activeCollection].filters,
    //       [activeFilter]: {
    //         ...listFilters[activeCollection].filters[activeFilter],
    //         filter: {
    //           ...listFilters[activeCollection].filters[activeFilter].filter, description: value
    //         }
    //       }
    //     }
    //   }
    // }

    setListFilters(newDescription);
  }

  const onChangeEntry = (value: string) => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    setListFilters({
      ...listFilters,
      [activeCollection]: {
        ...listFilters[activeCollection],
        filters: {
          ...listFilters[activeCollection].filters,
          [activeFilter]: {
            ...listFilters[activeCollection].filters[activeFilter],
            filter: { ...listFilters[activeCollection].filters[activeFilter].filter, value: value }
          }
        }
      } 
    })
  }

  const onDuplicateFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);
    const newFilter = uuid();

    newFilters.filters[newFilter] = cloneDeep(newFilters.filters[activeFilter]);
    newFilters.filters[newFilter].filter.name += '-dublicate';
    setListFilters({ ...listFilters, [activeCollection]: newFilters });
    setActiveFilter(newFilter);
  }

  const createNewFilter = () => {
    if (!activeCollection) {
      return;
    }
    
    const newFilter = uuid();

    setListFilters({
      ...listFilters,
      [activeCollection]: {
        ...listFilters[activeCollection],
        filters: {
          ...listFilters[activeCollection].filters,
          [newFilter] : {
            filter: { description: '', value: defaultJsValue, name: 'new filter' }
          }
        }
      }
    });
    
    setActiveFilter(newFilter)
  }

  const deleteFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);
    delete newFilters.filters[activeFilter];

    setListFilters({ ...listFilters, [activeCollection]: newFilters });

    setActiveFilter(undefined)
  }

  const createNewCollection = () => {
    const newCollection = uuid();
    setListFilters({ ...listFilters, [newCollection]: {
      name: 'new collection',
      filters: {}
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
    newCollections[newCollection].name += '-dublicate';
    setListFilters(newCollections);
    setActiveCollection(newCollection);
  }

  const deleteCollection = () => {
    if (!activeCollection) {
      return;
    }

    const newFilters = cloneDeep(listFilters);
    delete newFilters[activeCollection];

    setListFilters(newFilters);

    setActiveCollection(undefined)
  }

  const useFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilter: string = listFilters[activeCollection].filters[activeFilter].filter.value || '';
    const newChain: Record<string, t.ChainEntry> = { ...usedFilters,  [uuid()]: { filter: { value: newFilter } } };
    props.onChange(newChain);
    setUsedFilters(newChain);
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
                <span onClick={() => {setActiveCollection(collection), setActiveFilter(undefined)}} className={`${s.Inactive} ${activeCollection === collection && s.Active}`}>
                  {listFilters[collection].name}
                </span>
              ))}
            </div>
            <div className={`${s.Buttons}`}>
               <Button
                type='danger'
                text='Delete'
                onClick={() => deleteCollection()}
                disabled={!activeCollection}
              />
              <Button
                type='primary'
                text='Duplicate'
                onClick={() => onDuplicateCollection()}
                disabled={!activeCollection}
              />
              <Button
                type='primary'
                text='Create new'
                onClick={() => createNewCollection()}
              />
            </div>
          </div>

          <div className={`${s.Column}`}>
            <div className={`${s.Filters}`}>
              <H3>
                Filters
              </H3>
              {activeCollection && listFilters[activeCollection].filters && Object.keys(listFilters[activeCollection].filters).map(filter => (
                <span
                  onClick={() => {
                    setActiveFilter(filter);
                  }}
                  className={`${s.Inactive} ${activeFilter === filter && s.Active} ${filter.length === 0 && s.Empty}`}
                >
                  {listFilters[activeCollection].filters[filter].filter.name}
                  {listFilters[activeCollection].filters[filter].filter.name.length === 0 && 'write filter name'}
                </span>
              ))}
            </div>
            <div className={`${s.Buttons}`}>
              <Button
                type='danger'
                text='Delete'
                onClick={() => deleteFilter()}
                disabled={!activeFilter}
              />
              <Button
                type='primary'
                text='Duplicate'
                onClick={() => onDuplicateFilter()}
                disabled={!activeFilter}
              />
              <Button
                type='primary'
                text='Create new'
                onClick={() => createNewFilter()}
                disabled={!activeCollection}
              />
            </div>
          </div>

          <div className={`${s.Column}`}>
            <H3>
              Filter description
            </H3>
            {activeFilter && activeCollection && listFilters[activeCollection].filters[activeFilter] ?
              <>
                <Input
                  value={listFilters[activeCollection].filters[activeFilter].filter.name}
                  onChange={(value) => {onChangeEntryName(value)}}
                  placeholder="message-filter"
                />
                {listFilters[activeCollection].filters[activeFilter] &&
                  <Input
                    value={listFilters[activeCollection].filters[activeFilter].filter.description || ''}
                    onChange={(value) => onChangeDescription(value)}
                    placeholder="useful filter"
                  />
                }
              </> :
              <span>
                Choose filter
              </span>
            }
          </div> 

          <div className={`${s.Column} ${s.JsonEditor}`}>
            <H3>
              Json code editor
            </H3>
            {activeFilter && activeCollection ?
              <Filter
                value={listFilters[activeCollection].filters[activeFilter].filter.value || ''}
                onChange={(value) => onChangeEntry(value)}
                key={`${activeCollection}-${activeFilter}`}
              /> :
              <span>
                Choose filter
              </span>
            }
          </div>

          <Button
            type='primary'
            text='Save'
            onClick={() => onSave()}
          />
          <Button
            type='primary'
            text='Use'
            onClick={() => useFilter()}
          />
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor;