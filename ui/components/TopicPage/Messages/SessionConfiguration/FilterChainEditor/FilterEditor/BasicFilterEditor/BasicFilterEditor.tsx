import React from 'react';
import s from './BasicFilterEditor.module.css'
import {BasicMessageFilterValue, BasicMessageFilterValueTarget} from "../../../../types";
import Input from "../../../../../../ui/Input/Input";
import Checkbox from "../../../../../../ui/Checkbox/Checkbox";
import * as t from "../../../../types";
import {defaultJsFilterValue} from "../JsFilterEditor/JsFilterEditor";
import Select from "../../../../../../ui/Select/Select";
import {useDebounce} from "use-debounce";

export type BasicFilterEditorProps = {
  filterValue: BasicMessageFilterValue;
  onChange: (filterValue: BasicMessageFilterValue) => void;
};

const BasicFilterEditor: React.FC<BasicFilterEditorProps> = (props) => {
  const [filterValue, setFilterValue] = React.useState<string>(props.filterValue.value || '');

  const isCaseSensitiveAvailable = props.filterValue.isCaseSensitive !== undefined;
  const isValueAvailable = props.filterValue.value !== undefined;

  React.useEffect(() => {
    if (filterValue !== props.filterValue.value) {
      props.onChange({...props.filterValue, value: filterValue});
    }
  }, [filterValue]);

  return (
    <div className={s.BasicFilterEditor}>
      <div className={s.BasicFilterEditorTarget}>
        <strong>Target</strong>
        <Select<t.BasicMessageFilterValueTarget>
          list={[
            { type: 'item', title: 'Value', value: 'value' },
            { type: 'item', title: 'Key', value: 'key' },
            { type: 'item', title: 'Property', value: 'properties' },
            { type: 'item', title: 'Accum', value: 'accum' },
          ]}
          value={props.filterValue.target}
          onChange={(v) => props.onChange({...props.filterValue, target: v})}
        />
      </div>
      <div className={s.BasicFilterEditorControls}>
        {isValueAvailable &&
          <>
            <strong>Filter value</strong>

            <div className={s.ControlsRow}>
              <Input
                value={filterValue}
                onChange={(v) => setFilterValue(v)}
                clearable={true}
                focusOnMount={true}
              />
              {isCaseSensitiveAvailable &&
                <div className={s.ActionCheckbox}>
                  <div className={s.CaseSensitiveCheckbox}>
                    <Checkbox
                      isInline
                      id="case-sensitive-checkbox" checked={props.filterValue.isCaseSensitive}
                      onChange={() => props.onChange({
                        ...props.filterValue,
                        isCaseSensitive: !props.filterValue.isCaseSensitive}
                      )}
                    />
                  </div>
                  <div className={s.CaseSensitiveInfo}>
                    <label data-testid="case-sensitive-checkbox-info" htmlFor="case-sensitive-checkbox">
                      Is case sensitive
                    </label>
                  </div>
                </div>
              }
            </div>
          </>
        }
        </div>
    </div>
  );
}

export default BasicFilterEditor;
