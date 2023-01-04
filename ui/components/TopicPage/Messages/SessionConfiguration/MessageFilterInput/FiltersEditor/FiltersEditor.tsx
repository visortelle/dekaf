import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';

import { DefaultProvider, useContext } from '../../../../../app/contexts/Modals/Modals';
import Button from '../../../../../ui/Button/Button';
import { H3 } from '../../../../../ui/H/H';
import Input from '../../../../../ui/Input/Input';
import Filter from '../Filter';
import * as t from '../types';

import s from './FiltersEditor.module.css';

type Props = {
  editableFilter?: string,
  user: string,
  filters: t.MessageFilters,
  onChange: (f: t.MessageFilters) => void,
}

const FiltersEditor = (props: Props) => {
  const modals = useContext();

  const [activeUser, setActiveUser] = useState<string>(props.user);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(props.editableFilter);
  const [filters, setFilters] = useState(props.filters)

  const changeEntryId = (value: string) => {
    if (!activeFilter || !activeUser) {
      return
    }

    setActiveFilter(value);

    Object.keys(props.filters[activeUser]).map(filterName => {
      if (filterName === value) {
        return;
      }
    })

    const newFilters = cloneDeep(filters[activeUser]);
    newFilters[value] = props.filters[activeUser][activeFilter];

    if (!newFilters[value]) {
      newFilters[value] = filters[activeUser][activeFilter]
    }
    delete newFilters[activeFilter];


    setFilters({
      ...props.filters,
      [activeUser]:  newFilters
    })

    props.onChange({
      ...props.filters,
      [activeUser]:  newFilters
    })
  }

  const changeDescription = (value: string) => {
    if (!activeUser || !activeFilter) {
      return;
    }

    const newDescription = {
      ...filters,
      [activeUser]: {
        ...filters[activeUser],
        [activeFilter]: {
          filter: {
            ...filters[activeUser][activeFilter].filter, description: value
          }
        }
      }
    }

    setFilters(newDescription)
    props.onChange(newDescription)
  }

  const changeEntry = (value: string) => {
    if (!activeUser || !activeFilter) {
      return;
    }

    const newEntry = {  ...filters, [activeUser]: { ...filters[activeUser], [activeFilter]: { filter: { ...filters[activeUser][activeFilter].filter, value: value} } } }
    
    setFilters(newEntry)
    props.onChange(newEntry)
  }

  const deleteFilter = () => {
    if (!activeUser || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(filters[activeUser]);
    delete newFilters[activeFilter];

    setFilters({
      ...props.filters,
      [activeUser]:  newFilters
    })

    props.onChange({
      ...props.filters,
      [activeUser]:  newFilters
    })
  }

  const duplicateFilter = () => {
    if (!activeUser || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(filters[activeUser]);

    let counter = 0;
    Object.keys(newFilters).map(filter => {
      if (filter === `${activeFilter}-duplicate-${counter}`) {
        counter++
      }
    })
    newFilters[`${activeFilter}-duplicate-${counter}`] = newFilters[activeFilter];

    newFilters[activeUser]
    setFilters({
      ...props.filters,
      [activeUser]:  newFilters
    })

    props.onChange({
      ...props.filters,
      [activeUser]:  newFilters
    })
  }

  useEffect(() => {
    console.log(filters)
  }, [filters])
 
  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`}>

          <div className={`${s.Column}`}>
            <H3>
              Recently used
            </H3>
            {Object.keys(props.filters).map(user => (
              <span onClick={() => setActiveUser(user)}>
                {user}
              </span>
            ))}
          </div>

          <div className={`${s.Column}`}>
            <H3>
              Filters
            </H3>
            {activeUser && Object.keys(filters[activeUser]).map(filter => (
              <p onClick={() => setActiveFilter(filter)}>
                {filter}
              </p>
            ))}
            <div>
              <Button
                type='danger'
                text='Delete'
                onClick={() => deleteFilter()}
              />
              <Button
                type='primary'
                text='Duplicate'
                onClick={() => duplicateFilter()}
              />
              <Button
                type='primary'
                text='Create new'
                onClick={() => {}}
              />
            </div>
          </div>

          <div className={`${s.Column}`}>
            <H3>
              Filter description
            </H3>
            {activeFilter &&
              <>
                <Input
                  value={activeFilter}
                  onChange={(value) => {changeEntryId(value)}}
                />
                {filters[activeUser][activeFilter] &&
                  <Input
                    value={filters[activeUser][activeFilter].filter.description || 'Have not description'}
                    onChange={(value) => changeDescription(value)}
                  />
                }
              </>
            }
          </div>

          <div className={`${s.Column}`}>
            <H3>
              json code editor
            </H3>
            {activeFilter &&
              filters[activeUser][activeFilter] &&
              <Filter
                value={filters[activeUser][activeFilter].filter.value || ''}
                onChange={(value) => changeEntry(value)}
              />
            }
          </div>

          <div onClick={() => modals.pop()}>X</div>
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor