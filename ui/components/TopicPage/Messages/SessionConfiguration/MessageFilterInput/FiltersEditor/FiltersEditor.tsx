import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';

import { DefaultProvider, useContext } from '../../../../../app/contexts/Modals/Modals';
import Button from '../../../../../ui/Button/Button';
import { H3 } from '../../../../../ui/H/H';
import Input from '../../../../../ui/Input/Input';
import Filter, { defaultJsValue } from '../Filter';
import * as t from '../types';

import s from './FiltersEditor.module.css';

type Props = {
  editableFilter?: string,
  package: string,
  filters: t.MessageFilters,
  onChange: (f: t.MessageFilters) => void,
}

const FiltersEditor = (props: Props) => {
  const modals = useContext();

  const [activePackage, setActivePackage] = useState<string>(props.package);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(props.editableFilter);
  const [filters, setFilters] = useState(props.filters)

  const changeEntryId = (value: string) => {
    if (!activeFilter || !activePackage) {
      return
    }

    setActiveFilter(value);

    Object.keys(props.filters[activePackage]).map(filterName => {
      if (filterName === value) {
        return;
      }
    })

    const newFilters = cloneDeep(filters[activePackage]);
    newFilters[value] = props.filters[activePackage][activeFilter];

    if (!newFilters[value]) {
      newFilters[value] = filters[activePackage][activeFilter]
    }
    delete newFilters[activeFilter];


    setFilters({
      ...props.filters,
      [activePackage]:  newFilters
    })

    props.onChange({
      ...props.filters,
      [activePackage]:  newFilters
    })
  }

  const changeDescription = (value: string) => {
    if (!activePackage || !activeFilter) {
      return;
    }

    const newDescription = {
      ...filters,
      [activePackage]: {
        ...filters[activePackage],
        [activeFilter]: {
          filter: {
            ...filters[activePackage][activeFilter].filter, description: value
          }
        }
      }
    }

    setFilters(newDescription)
    props.onChange(newDescription)
  }

  const changeEntry = (value: string) => {
    if (!activePackage || !activeFilter) {
      return;
    }

    const newEntry = {  ...filters, [activePackage]: { ...filters[activePackage], [activeFilter]: { filter: { ...filters[activePackage][activeFilter].filter, value: value} } } }
    
    setFilters(newEntry)
    props.onChange(newEntry)
  }

  const deleteFilter = () => {
    if (!activePackage || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(filters[activePackage]);
    delete newFilters[activeFilter];

    setFilters({
      ...props.filters,
      [activePackage]:  newFilters
    })

    setActiveFilter('')

    props.onChange({
      ...props.filters,
      [activePackage]:  newFilters
    })
  }

  const duplicateFilter = () => {
    if (!activePackage || !activeFilter) {
      return;
    }

    const newFilters = cloneDeep(filters[activePackage]);

    let counter = 0;
    Object.keys(newFilters).map(filter => {
      if (filter === `${activeFilter}-duplicate-${counter}`) {
        counter++
      }
    })
    newFilters[`${activeFilter}-duplicate-${counter}`] = newFilters[activeFilter];

    newFilters[activePackage]
    setFilters({
      ...props.filters,
      [activePackage]:  newFilters
    })

    props.onChange({
      ...props.filters,
      [activePackage]:  newFilters
    })

    setActiveFilter(`${activeFilter}-duplicate-${counter}`)
  }

  const createNewFilter = () => {
    if (!activePackage) {
      return;
    }

    const newFilters = cloneDeep(filters[activePackage]);

    let counter = 0;
    Object.keys(newFilters).map(filter => {
      if (filter === `new-filter-${counter}`) {
        counter++
      }
    })
    newFilters[`new-filter-${counter}`] = {filter: { description: '', value: defaultJsValue }};

    newFilters[activePackage]
    setFilters({
      ...props.filters,
      [activePackage]:  newFilters
    })

    props.onChange({
      ...props.filters,
      [activePackage]:  newFilters
    })

    setActiveFilter(`new-filter-${counter}`)
  }

  useEffect(() => {
    console.log(filters)
  }, [filters])
 
  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`}>

          <div className={`${s.Column}`}>
            <H3>
              Packages
            </H3>
            {Object.keys(props.filters).map(filterPackage => (
              <span onClick={() => setActivePackage(filterPackage)} className={`${s.Inactive} ${activePackage === filterPackage && s.Active}`}>
                {filterPackage}
              </span>
            ))}
          </div>

          <div className={`${s.Column}`}>
            <div className={`${s.Filters}`}>
              <H3>
                Filters
              </H3>
              {activePackage && Object.keys(filters[activePackage]).map(filter => (
                <span onClick={() => setActiveFilter(filter)} className={`${s.Inactive} ${activeFilter === filter && s.Active}`}>
                  {filter}
                </span>
              ))}
            </div>
            <div className={`${s.Buttons}`}>
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
                onClick={() => createNewFilter()}
              />
            </div>
          </div>

          <div className={`${s.Column}`}>
            <H3>
              Filter description
            </H3>
            {activeFilter ?
              <>
                <Input
                  value={activeFilter}
                  onChange={(value) => {changeEntryId(value)}}
                />
                {filters[activePackage][activeFilter] &&
                  <Input
                    value={filters[activePackage][activeFilter].filter.description || 'Have not description'}
                    onChange={(value) => changeDescription(value)}
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
              json code editor
            </H3>
            {activeFilter && filters[activePackage][activeFilter] ?
              <Filter
                value={filters[activePackage][activeFilter].filter.value || ''}
                onChange={(value) => changeEntry(value)}
              /> :
              <span>
                Choose filter
              </span>
            }
          </div>
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor