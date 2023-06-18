import s from './FiltersToolbar.module.css'
import { TableFilterDescriptor, TableFilterValue } from '../filters/types';
import removeFilterIcon from './remove-filter.svg';
import SvgIcon from '../../SvgIcon/SvgIcon';
import StringFilterInput from '../filters/StringFilterInput/StringFilterInput';
import { Columns } from '../Table';

export type FilterInUse = {
  state: 'active' | 'inactive',
  value: TableFilterValue
};

export type FiltersToolbarProps<CK extends string> = {
  filters: Partial<Record<CK, FilterInUse>>;
  columns: Columns<CK, any, any>;
  onChange: (filters: Partial<Record<CK, FilterInUse>>) => void;
};

function FiltersToolbar<CK extends string>(props: FiltersToolbarProps<CK>) {
  return (
    <div className={s.FiltersToolbar}>
      {Object.keys(props.filters).map((columnKey) => {
        const filterInUse = props.filters[columnKey as CK]!;
        const column = props.columns.columns[columnKey as CK]!;

        return (
          <div key={columnKey} className={`${s.Filter} ${filterInUse.state === 'inactive' ? s.InactiveFilter : ''}`}>
            <div
              className={s.FilterTitle}
              title={filterInUse.state === 'active' ? 'Disable filter' : 'Enable filter'}
              onClick={() => {
                const newFilters = { ...props.filters };
                newFilters[columnKey as CK] = {
                  ...filterInUse,
                  state: filterInUse.state === 'active' ? 'inactive' : 'active'
                };
                props.onChange(newFilters);
              }}
            >
              <strong>{column.title}:</strong>
            </div>
            <FilterEditor
              value={filterInUse}
              onChange={(v) => {
                const newFilters = { ...props.filters };
                newFilters[columnKey as CK] = v;
                props.onChange(newFilters);
              }}
              filterDescriptor={column.filter?.descriptor!}
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
  filterDescriptor: TableFilterDescriptor;
  value: FilterInUse;
  onChange: (value: FilterInUse) => void;
}

function FilterEditor(props: FilterEditorProps) {
  return (
    <div className={s.FilterEditor}>
      {(props.filterDescriptor.type === 'string' && props.value.value.type === 'string') && (
        <StringFilterInput
          descriptor={props.filterDescriptor}
          value={{ type: 'string', value: props.value.value.value }}
          onChange={(v) => props.onChange({ ...props.value, value: { type: 'string', value: v.value } })}
        />
      )}
    </div>
  );
};

export default FiltersToolbar;
