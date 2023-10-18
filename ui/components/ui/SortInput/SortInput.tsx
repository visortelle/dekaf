import React from 'react';
import s from './SortInput.module.css'
import Select from '../Select/Select';

export type Sort<Option extends string> = {
  sortBy: Option;
  sortDirection: 'asc' | 'desc';
};

export type SortInputProps<Option extends string> = {
  options: Option[];
  value: Sort<Option>;
  onChange: (value: Sort<Option>) => void;
};

type InternalOption<Option extends string> = {
  type: 'item';
  title: string;
  value: Sort<Option>;
};

function SortInput<Option extends string>(props: SortInputProps<Option>): React.ReactElement {
  const internalOptions: Record<string, InternalOption<Option>> = React.useMemo(() => {
    const asArr = props.options.map((option) => {
      const ascOption: InternalOption<Option> = {
        type: 'item',
        title: `Sort by ${option} ⇣`,
        value: {
          sortBy: option,
          sortDirection: 'asc',
        }
      };
      const descOption: InternalOption<Option> = {
        type: 'item',
        title: `Sort by ${option}  ⇡`,
        value: {
          sortBy: option,
          sortDirection: 'desc',
        }
      };

      return [ascOption, descOption];
    }).flat()
    return Object.fromEntries(asArr.map((option) => [`${option.value.sortBy}-${option.value.sortDirection}`, option]));
  }, [props.options]);

  return (
    <div className={s.SortInput}>
      <Select<string>
        list={Object.entries(internalOptions).map(([key, option]) => {
          return {
            type: 'item',
            title: option.title,
            value: key,
          }
        })}
        onChange={(v) => props.onChange({ ...props.value, sortBy: internalOptions[v].value.sortBy, sortDirection: internalOptions[v].value.sortDirection })}
        value={`${props.value.sortBy}-${props.value.sortDirection}`}
        appearance='no-borders'
      />
    </div>
  );
}

export default SortInput;

