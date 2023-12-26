import React from 'react';
import s from './TestOpArrayAllInput.module.css'
import { BasicMessageFilterFieldTarget, TestOpArrayAll } from '../../../../../../../basic-message-filter-types';
import BasicMessageFilterOpInput from '../../BasicMessageFilterOpInput';
import BasicMessageFilterFieldTargetInput from '../../../BasicMessageFilterTargetInput/BasicMessageFilterFieldTargetInput/BasicMessageFilterFieldTargetInput';
import IconToggle from '../../../../../../../../../ui/IconToggle/IconToggle';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type TestOpArrayAllInputProps = {
  value: TestOpArrayAll,
  onChange: (v: TestOpArrayAll) => void,
  isReadOnly?: boolean
};

const TestOpArrayAllInput: React.FC<TestOpArrayAllInputProps> = (props) => {
  return (
    <div className={s.TestOpArrayAllInput}>
      <FormItem size='small'>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: '-32rem'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: Boolean(props.value.itemFieldTarget) ? undefined : '-6rem',
            marginBottom: Boolean(props.value.itemFieldTarget) ? undefined : '-6rem',
          }}>
            <IconToggle<boolean>
              items={[
                { type: "item", value: true, label: "list item's sub field", help: "Click to select the entire item" },
                { type: "item", value: false, label: 'list item', help: "Click to select the list item's sub field" }
              ]}
              value={Boolean(props.value.itemFieldTarget)}
              onChange={(v) => {
                let itemFieldTarget: BasicMessageFilterFieldTarget | undefined = undefined;

                if (v) {
                  itemFieldTarget = { type: "BasicMessageFilterFieldTarget", jsonFieldSelector: undefined };
                }

                props.onChange({ ...props.value, itemFieldTarget });
              }}
              isReadOnly={props.isReadOnly}
            />
          </div>
          {props.value.itemFieldTarget?.type === "BasicMessageFilterFieldTarget" && (
            <div style={{ flex: 1 }}>
              <BasicMessageFilterFieldTargetInput
                value={props.value.itemFieldTarget}
                onChange={(v) => props.onChange({ ...props.value, itemFieldTarget: v })}
                isReadOnly={props.isReadOnly}
              />
            </div>
          )}
        </div>
      </FormItem>
      <BasicMessageFilterOpInput
        value={props.value.testItemOp}
        onChange={(v) => props.onChange({ ...props.value, testItemOp: v })}
        isShowEnableToggle={false}
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default TestOpArrayAllInput;
