import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { DefaultProvider, useContext } from '../../../../../app/contexts/Modals/Modals';
import Button from '../../../../../ui/Button/Button';
import { H3 } from '../../../../../ui/H/H';
import Filter from '../Filter';
import { Filter as FilterValue } from '../types';
import * as t from '../types';

import s from './FiltersEditor.module.css';
// import { FilterConfigurations, FilterType } from '../FilterChain';
import Input from '../../../../../ui/Input/Input';

type Props = {
  // newFilters?: Record<string, t.ChainEntry>
  // filter?: {
  //   entryId: string,
  //   entry: string,
  // },
  user: string,
  filters: t.MessageFilters
  onChange?: (entryId: string, entry: string, description: string) => void;

  // onChange: ({[entryId: string]: { filter: { value: entry, description: description } }}) => void
}

const FiltersEditor = (props: Props) => {
  const modals = useContext();

  const [activeUser, setActiveUser] = useState<string>(props.user);
  const [activeFilter, setActiveFilter] = useState<string>();
  // const [filterValue, setFilterValue] = useState<FilterValue>({ value: '' });

  // const { filters,  onChange } = props;

  useEffect(() => {
    console.log(props)
  }, [])

  return (
    <DefaultProvider>
      <div className={`${s.FiltersEditor}`}>

          <div className={`${s.Column}`}>
            <H3>
              Recently used
            </H3>
            {Object.keys(props.filters).map(user => (
              <span>
                {user}
              </span>
            ))}
          </div>

          <div className={`${s.Column}`}>
            <H3>
              Filters
            </H3>
            {activeUser && Object.keys(props.filters).map((user) => (
              <div>
                <p>{user}</p>
                {Object.keys(props.filters[user]).map(filter => (
                  <p onClick={() => setActiveFilter(filter)}>
                    {filter}
                  </p>
                ))}
                {/* <p onClick={() => setActiveFilter(props.filters[user]])}>
                  {props.filters[user][index]}
                </p> */}
              </div>
            ))}
            <div>
              <Button
                type='danger'
                text='Delete'
                onClick={() => {}}
              />
              <Button
                type='primary'
                text='Duplicate'
                onClick={() => {}}
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
                  onChange={(value) => {
                    // props.onChange({})
                    // props.onChange &&
                    // props.onChange({ description: activeFilter.description, value: value })
                  }}
                />

                <Input
                  value={props.filters[activeUser][activeFilter].filter.description || ''}
                  onChange={(value) => {
                    // props.onChange &&
                    // props.onChange({ value: activeFilter, description: value })
                  }}
                />
              </>
            }
          </div>

          <div className={`${s.Column}`}>
            <H3>
              json code editor
            </H3>
            {activeFilter &&
              <Filter
                value={props.filters[activeUser][activeFilter].filter}
                onChange={(v) => {} }
                  // onChange &&
                  // onChange(activeFilter.entryId, v.description || 'a', v.value || 'a')}
                // onChange={(v) => {setActiveFilter({ ...activeFilter, entry: v.value || '' })}}
                // }
              />
            }
          </div>

          <div onClick={() => modals.pop()}>X</div>
      </div>
    </DefaultProvider>
  )
}

export default FiltersEditor