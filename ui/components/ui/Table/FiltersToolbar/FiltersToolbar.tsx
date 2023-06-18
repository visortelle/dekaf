import React, { ReactNode } from 'react';
import s from './FiltersToolbar.module.css'
import { TableFilterDescriptor, TableFilterValue } from '../filters/types';
import removeFilterIcon from './remove-filter.svg';
import SvgIcon from '../../SvgIcon/SvgIcon';
import StringFilterInput from '../filters/StringFilterInput/StringFilterInput';

export type FilterInUse = {
  state: 'active' | 'inactive',
  title: ReactNode,
  descriptor: TableFilterDescriptor,
  value: TableFilterValue
};

export type FiltersToolbarProps<CK extends string> = {
  filters: Partial<Record<CK, FilterInUse>>;
  onChange: (filters: Partial<Record<CK, FilterInUse>>) => void;
};

function FiltersToolbar<CK extends string>(props: FiltersToolbarProps<CK>) {
  return (
    <div className={s.FiltersToolbar}>
      {Object.keys(props.filters).map((columnKey) => {
        const filter = props.filters[columnKey as CK]!;

        return (
          <div key={columnKey} className={`${s.Filter} ${filter.state === 'inactive' ? s.InactiveFilter : ''}`}>
            <div
              className={s.FilterTitle}
              title={filter.state === 'active' ? 'Disable filter' : 'Enable filter'}
              onClick={() => {
                const newFilters = { ...props.filters };
                newFilters[columnKey as CK] = {
                  ...filter,
                  state: filter.state === 'active' ? 'inactive' : 'active'
                };
                props.onChange(newFilters);
              }}
            >
              <strong>{filter.title}:</strong>
            </div>
            <FilterEditor
              value={filter}
              onChange={(v) => {
                const newFilters = { ...props.filters };
                newFilters[columnKey as CK] = v;
                props.onChange(newFilters);
              }}
            />

            <div
              className={s.RemoveFilterIcon}
              title="Remove filter"
              onClick={() => {
                const newFilters = { ...props.filters };
                delete newFilters[columnKey as CK];
                props.onChange(newFilters);
              }}
            >
              <SvgIcon svg={removeFilterIcon} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type FilterEditorProps = {
  value: FilterInUse;
  onChange: (value: FilterInUse) => void;
}

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  return (
    <div className={s.FilterEditor}>
      {(props.value.descriptor.type === 'string' && props.value.value.type === 'string') && (
        <StringFilterInput
          descriptor={props.value.descriptor}
          value={{ type: 'string', value: props.value.value.value }}
          onChange={(v) => props.onChange({ ...props.value, value: { type: 'string', value: v.value } })}
        />
      )}
    </div>
  );
};

export default FiltersToolbar;
