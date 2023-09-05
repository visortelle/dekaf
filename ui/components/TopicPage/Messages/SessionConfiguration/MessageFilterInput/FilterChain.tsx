import React from 'react';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';

import Button from '../../../../ui/Button/Button';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from './types';
import Filter from './Filter';
import FiltersEditor from './FiltersEditor/FiltersEditor';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import deleteIcon from './icons/delete.svg';
import enableIcon from './icons/enable.svg';
import saveIcon from './icons/save.svg';

import s from './FilterChain.module.css';

const defaultFilter = `({ key, value, accum }) => {
  return true;
}`;

export type FilterChainProps = {
  value: t.Chain;
  onChange: (value: t.Chain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.FilterChain}>

      <div style={{ marginBottom: '12rem', width: '370rem' }}>
        <Select<'all' | 'any'>
          list={[
            { type: 'item', title: 'All filters should match', value: 'all' },
            { type: 'item', title: 'At least one filter should match', value: 'any' },
          ]}
          value={props.value.mode}
          onChange={v => props.onChange({ ...props.value, mode: v })}
        />
      </div>

      {props.value.filters && Object.entries(props.value.filters).map(([entryId, entry], index) => {
        const isDisabled = props.value.disabledFilters.includes(entryId);
        return (
          <div key={entryId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <Filter
                value={entry.filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [entryId]: {filter: f}  } })}
                autoCompleteConfig={index === 0}
              />
            </div>
            <div className={s.EntryButtons}>
              <div className={s.EntryButton}>
                <Button
                  svgIcon={enableIcon}
                  onClick={() => {
                    const newDisabledFilters = props.value.disabledFilters.includes(entryId) ?
                      props.value.disabledFilters.filter(id => id !== entryId) :
                      [...props.value.disabledFilters, entryId];
                    props.onChange({ ...props.value, disabledFilters: newDisabledFilters });
                  }}
                  title={isDisabled ? 'Enable filter' : 'Disable filter'}
                  type={isDisabled ? 'regular' : 'primary'}
                />
              </div>

              <div className={s.EntryButton}>
                <Button
                  svgIcon={saveIcon}
                  onClick={() => modals.push({
                    id: 'edit-filter',
                    title: `Message filter browser`,
                    content:
                      <FiltersEditor
                        filters={props.value.filters}
                        onChange={(f) => props.onChange({ ...props.value, filters: f })}
                        entry={entry.filter.value }
                      />,
                    styleMode: 'no-content-padding'
                  })}
                  title="save filter"
                  type='primary'
                />
              </div>

              <div className={s.EntryButton} style={{ marginTop: 'auto' }}>
                <Button
                  svgIcon={deleteIcon}
                  onClick={() => {
                    const newFilters = cloneDeep(props.value.filters);
                    delete newFilters[entryId];
                    props.onChange({ ...props.value, filters: newFilters });
                  }}
                  type="danger"
                  title="Delete filter"
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className={`${s.Buttons}`}>
        <SmallButton
          onClick={() => {
            const newFilter: t.Filter = { value: defaultFilter };
            const newChain: t.Chain = { ...props.value, filters: { ...props.value.filters, [uuid()]: { filter: newFilter } } };
            props.onChange(newChain);
          }}
          text="Add filter"
          type='primary'
        />
        <SmallButton
          onClick={() => modals.push({
            id: 'filter-editor',
            title: `Message filter browser`,
            content:
              <FiltersEditor
                filters={props.value.filters}
                onChange={(f) => (props.onChange({ ...props.value, filters: f }))}
              />,
            styleMode: 'no-content-padding'
          })}

          text="Choose filter"
          type='primary'
        />
      </div>
    </div>
  );
}

export default FilterChain;
