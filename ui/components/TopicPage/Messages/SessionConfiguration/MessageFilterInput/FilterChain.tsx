import React, {useCallback} from 'react';
import {v4 as uuid} from 'uuid';
import {cloneDeep} from 'lodash';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from './types';
import Filter from './Filter';
import FiltersEditor from './FiltersEditor/FiltersEditor';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import deleteIcon from './icons/delete.svg';
import saveIcon from './icons/save.svg';

import s from './FilterChain.module.css';
import SaveToExistingCollectionModal from "./SaveToExistingCollectionModal/SaveToExistingCollectionModal";
import SaveAsCollectionModal from "./SaveAsCollectionModal/SaveAsCollectionModal";
import Toggle from "../../../../ui/Toggle/Toggle";
import {TopicNode} from "../../Message/ReprocessMessage/types";

export const defaultFilter: t.Filter = {
  value: "({ key, value, accum }) => {\n  return true;\n}",
  description: "",
  name: "New filter"
};

export type FilterChainProps = {
  value: t.Chain;
  onChange: (value: t.Chain) => void;
  topicNode: TopicNode;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  const modals = Modals.useContext();

  const saveFiltersAsNewCollection = useCallback(() => {
    modals.push({
      id: 'save-filters',
      title: `Save filters as collection`,
      content: <SaveAsCollectionModal filters={props.value.filters} onDone={modals.pop} />,
      styleMode: 'no-content-padding'
    });

  }, [props.value.filters]);

  const saveFiltersToExistingCollection = useCallback(() => {
    modals.push({
      id: 'save-filters',
      title: `Add filters to collection`,
      content: <SaveToExistingCollectionModal filters={props.value.filters} onDone={modals.pop}/>,
      styleMode: 'no-content-padding'
    });
  }, [props.value.filters]);

  const onFilterToggle = useCallback((entryId: string) => {
    const newDisabledFilters = props.value.disabledFilters.includes(entryId) ?
      props.value.disabledFilters.filter(id => id !== entryId) :
      [...props.value.disabledFilters, entryId];
    props.onChange({ ...props.value, disabledFilters: newDisabledFilters });
  }, [props.value, props.onChange]);

  return (
    <div className={s.FilterChain}>
      <div style={{marginBottom: '12rem'}}>
        <Select<'all' | 'any'>
          list={[
            {type: 'item', title: 'All filters should match', value: 'all'},
            {type: 'item', title: 'At least one filter should match', value: 'any'},
          ]}
          value={props.value.mode}
          onChange={v => props.onChange({...props.value, mode: v})}
        />
      </div>
      <div className={s.FilterChainMainButtons}>
        <div className={s.RowButtons}>
          <SmallButton
            onClick={() => {
              const newChain: t.Chain = {
                ...props.value,
                filters: {...props.value.filters, [uuid()]: {filter: cloneDeep(defaultFilter)}}
              };
              props.onChange(newChain);
            }}
            text="New filter"
            type='primary'
          />
          <SmallButton
            onClick={() => modals.push({
              id: 'filter-editor',
              title: `Message filter browser`,
              content:
                <FiltersEditor
                  filters={props.value.filters}
                  topicNode={props.topicNode}
                  onChange={(chosenFilter) => (props.onChange({...props.value, filters: chosenFilter}))}
                  onDone={modals.pop}
                />,
              styleMode: 'no-content-padding'
            })}

            text="Browse filters"
            type='primary'
          />
        </div>

        <div className={s.RowButtons}>
          {props.value.filters && Object.entries(props.value.filters).length !== 0 &&
            <>
              <SmallButton
                onClick={saveFiltersAsNewCollection}
                type="primary"
                title="Save as Collection"
                text="Save as Collection"
              />
              <SmallButton
                onClick={saveFiltersToExistingCollection}
                type="primary"
                title="Add to Collection"
                text="Add to Collection"
              />
            </>
          }
        </div>
      </div>
      {props.value.filters && Object.entries(props.value.filters).map(([entryId, entry], index) => {
        const isDisabled = props.value.disabledFilters.includes(entryId);
        return (
          <div key={entryId} className={s.Entry}>
            <div className={s.EntryButtons}>
              <div className={s.EntryButtonsLeft}>
                <div className={s.EntryButton}>
                  <Toggle
                    value={!isDisabled}
                    onChange={() => onFilterToggle(entryId)}
                  />
                </div>
                <div className={s.EntryButton}>
                  <span className={s.FilterName}>{entry.filter.name}</span>
                </div>
              </div>

              <div className={s.EntryButtonsRight}>
                <div className={s.EntryButton}>
                  <SmallButton
                    svgIcon={saveIcon}
                    onClick={() => modals.push({
                      id: 'save-one-filter',
                      title: `Save filter to collection`,
                      content:
                        <SaveToExistingCollectionModal filters={{[entryId]: entry}} onDone={modals.pop}/>,
                      styleMode: 'no-content-padding'
                    })}
                    title="Save filter."
                    type={'primary'}
                    text="Save"
                  />
                </div>

                <div className={s.EntryButton}>
                  <SmallButton
                    svgIcon={deleteIcon}
                    onClick={() => {
                      const newFilters = cloneDeep(props.value.filters);
                      delete newFilters[entryId];
                      props.onChange({...props.value, filters: newFilters});
                    }}
                    type="danger"
                    title="Delete filter"
                    text="Delete"
                  />
                </div>
              </div>
            </div>
            <div className={s.EntryFilter}>
              <Filter
                value={entry.filter}
                onChange={(f) => props.onChange({
                  ...props.value,
                  filters: {...props.value.filters, [entryId]: {filter: f}}
                })}
                autoCompleteConfig={index === 0}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FilterChain;
