import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';

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


type Filter = {
  value: string | undefined;
  description: string;
}

type ChainEntry = {
  filter: Filter;
}

type ListFilters = {
  [collection: string]: Record<string, ChainEntry>
}

const FiltersEditor = (props: Props) => {

  const [activeCollection, setActiveCollection] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>(props.editableFilter);
  const [listFilters, setListFilters] = useState<ListFilters>({});
  // const [filters, setFilters] = useState(props.filters)

  useEffect(() => {
    const filters = localStorage.getItem('messageFilters')
    if (filters) {
      setListFilters(JSON.parse(filters));
    }
  }, []);

  const onSave = () => {
    localStorage.setItem('messageFilters', JSON.stringify(listFilters));
  }

  const onChangeEntryId = (value: string) => {
    if (!activeFilter || !activeCollection) {
      return
    }

    setActiveFilter(value);

    Object.keys(listFilters[activeCollection]).map(filterName => {
      if (filterName === value) {
        return;
      }
    });

    const newFilters = cloneDeep(listFilters[activeCollection]);
    newFilters[value] = listFilters[activeCollection][activeFilter];
    delete newFilters[activeFilter];

    setListFilters({ ...listFilters, [activeCollection]: newFilters});
  }

  const onChangeDescription = (value: string) => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newDescription = {
      ...listFilters,
      [activeCollection]: {
        ...listFilters[activeCollection],
        [activeFilter]: {
          filter: {
            ...listFilters[activeCollection][activeFilter].filter, description: value
          }
        }
      }
    }

    setListFilters(newDescription)
  }

  const onChangeEntry = (value: string) => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    setListFilters({
      ...listFilters,
      [activeCollection]: {
        ...listFilters[activeCollection],
        [activeFilter]: {
          ...listFilters[activeCollection][activeFilter],
          filter: { ...listFilters[activeCollection][activeFilter].filter, value: value }
        }
      } 
    })
  }

  const onDuplicateFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);

    let counter = 0;
    Object.keys(newFilters).map(filter => {
      if (filter === `${activeFilter}-duplicate-${counter}`) {
        counter++
      }
    });
    newFilters[`${activeFilter}-duplicate-${counter}`] = newFilters[activeFilter];

    setListFilters( { ...listFilters, [activeCollection]: newFilters })

    setActiveFilter(`${activeFilter}-duplicate-${counter}`)
  }

  const createNewFilter = () => {
    if (!activeCollection) {
      return;
    }

    let counter = 0;
    Object.keys(listFilters[activeCollection]).map(_ => {
      Object.keys(listFilters[activeCollection]).filter(filter => {
        if (filter === `new-filter-${counter}`) {
          counter++
        }
      })
    });

    const newFilter = `new-filter-${counter}`;
    setListFilters({
      ...listFilters,
      [activeCollection]: {
        ...listFilters[activeCollection],
        [newFilter]: {
          filter: { description: '', value: defaultJsValue }
        }
      }
    })
    
    setActiveFilter(newFilter)
  }

  const deleteFilter = () => {
    if (!activeCollection || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(listFilters[activeCollection]);
    delete newFilters[activeFilter];

    setListFilters({ ...listFilters, [activeCollection]: newFilters });

    setActiveFilter(undefined)
  }

  const createNewCollection = () => {
    let counter = 0;
    Object.keys(listFilters).map(collection => {
      if (collection === `new-collection-${counter}`) {
        counter++
      }
    });
    const newCollection = `new-collection-${counter}`;
    setListFilters({ ...listFilters, [newCollection]: {} })

    setActiveCollection(newCollection)
  }

  const onDuplicateCollection = () => {
    if (!activeCollection) {
      return;
    }

    const newCollections = cloneDeep(listFilters);

    let counter = 0;
    Object.keys(newCollections).map(filter => {
      if (filter === `${activeCollection}-duplicate-${counter}`) {
        counter++
      }
    });
    newCollections[`${activeCollection}-duplicate-${counter}`] = newCollections[activeCollection];

    setListFilters(newCollections)
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

  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`}>

          <div className={`${s.Column}`}>
            <div className={`${s.Collections}`}>
              <H3>
                Collections
              </H3>
              {Object.keys(listFilters).map(collection => (
                <span onClick={() => setActiveCollection(collection)} className={`${s.Inactive} ${activeCollection === collection && s.Active}`}>
                  {collection}
                </span>
              ))}
            </div>
            <div className={`${s.Buttons}`}>
               <Button
                type='danger'
                text='Delete'
                onClick={() => deleteCollection()}
                disabled={!activeFilter}
              />
              <Button
                type='primary'
                text='Duplicate'
                onClick={() => onDuplicateCollection()}
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
              {activeCollection && listFilters[activeCollection] && Object.keys(listFilters[activeCollection]).map(filter => (
                <span
                  onClick={() => setActiveFilter(filter)}
                  className={`${s.Inactive} ${activeFilter === filter && s.Active}`}
                >
                  {filter}
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
            {activeFilter !== undefined && activeCollection !== undefined && listFilters[activeCollection][activeFilter] ?
              <>
                <Input
                  value={activeFilter}
                  onChange={(value) => {onChangeEntryId(value)}}
                />
                {listFilters[activeCollection][activeFilter] &&
                  <Input
                    value={listFilters[activeCollection][activeFilter].filter.description || 'Have not description'}
                    onChange={(value) => onChangeDescription(value)}
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
            {activeFilter && activeCollection && listFilters[activeCollection][activeFilter] ?
              <Filter
                value={listFilters[activeCollection][activeFilter].filter.value || ''}
                onChange={(value) => onChangeEntry(value)}
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
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor;