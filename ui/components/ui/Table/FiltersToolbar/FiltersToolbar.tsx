import s from './FiltersToolbar.module.css'
import { TableFilterDescriptor, TableFilterValue } from '../filters/types';
import removeFilterIcon from './remove-filter.svg';
import SvgIcon from '../../SvgIcon/SvgIcon';
import filterIcon from './filter.svg';
import StringFilterInput from '../filters/StringFilterInput/StringFilterInput';
import { Columns } from '../Table';
import Toggle from '../../Toggle/Toggle';
import SmallButton from '../../SmallButton/SmallButton';
import OptionFilterInput from '../filters/OptionFilterInput/OptionFilterInput';

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
            <div className={s.FilterTitle}>
              <strong className={s.FilterTitleText}>
                <div className={s.FilterIcon}>
                  <SvgIcon svg={filterIcon} />
                </div>

                {column.title}
              </strong>

              <div className={s.ToggleFilter}>
                <Toggle
                  value={filterInUse.state === 'active'}
                  onChange={(v) => {
                    const newFilters = { ...props.filters };
                    newFilters[columnKey as CK] = {
                      ...filterInUse,
                      state: v ? 'active' : 'inactive'
                    };
                    props.onChange(newFilters);
                  }}
                />
              </div>

              <div className={s.RemoveFilter}>
                <SmallButton
                  title="Remove filter"
                  type='danger'
                  svgIcon={removeFilterIcon}
                  onClick={() => {
                    const newFilters = { ...props.filters };
                    delete newFilters[columnKey as CK];
                    props.onChange(newFilters);
                  }}
                />
              </div>
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

      {(props.filterDescriptor.type === 'singleOption' && props.value.value.type === 'singleOption') && (
        <OptionFilterInput
          descriptor={props.filterDescriptor}
          value={{ type: 'singleOption', value: props.value.value.value }}
          onChange={(v) => props.onChange({ ...props.value, value: { type: 'singleOption', value: v.value } })}
        />
      )}


    </div>
  );
};

export default FiltersToolbar;
