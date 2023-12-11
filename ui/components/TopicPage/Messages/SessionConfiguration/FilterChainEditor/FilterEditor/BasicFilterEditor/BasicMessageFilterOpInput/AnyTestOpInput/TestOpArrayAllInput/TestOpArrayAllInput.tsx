import React from 'react';
import s from './TestOpArrayAllInput.module.css'
import { BasicMessageFilterFieldTarget, TestOpArrayAll } from '../../../../../../../basic-message-filter-types';
import BasicMessageFilterOpInput from '../../BasicMessageFilterOpInput';
import BasicMessageFilterFieldTargetInput from '../../../BasicMessageFilterTargetInput/BasicMessageFilterFieldTargetInput/BasicMessageFilterFieldTargetInput';
import Toggle from '../../../../../../../../../ui/Toggle/Toggle';
import IconToggle from '../../../../../../../../../ui/IconToggle/IconToggle';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type TestOpArrayAllInputProps = {
  value: TestOpArrayAll,
  onChange: (v: TestOpArrayAll) => void
};

const TestOpArrayAllInput: React.FC<TestOpArrayAllInputProps> = (props) => {
  return (
    <div className={s.TestOpArrayAllInput}>
      <FormItem>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: '-8rem',
          marginBottom: '-8rem',
          marginLeft: Boolean(props.value.itemFieldTarget) ? '-12rem' : '-8rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <IconToggle<boolean>
              items={[
                { type: "item", value: true, label: 'where sub field' },
                { type: "item", value: false, label: 'where entire item' }
              ]}
              value={Boolean(props.value.itemFieldTarget)}
              onChange={(v) => {
                let itemFieldTarget: BasicMessageFilterFieldTarget | undefined = undefined;

                if (v) {
                  itemFieldTarget = { type: "BasicMessageFilterFieldTarget", jsonFieldSelector: undefined };
                }

                props.onChange({ ...props.value, itemFieldTarget });
              }}
            />
            {/* {Boolean(props.value.itemFieldTarget) && (
              <FormLabel size='small' content="matches" />
            )} */}
          </div>
          {props.value.itemFieldTarget?.type === "BasicMessageFilterFieldTarget" && (
            <div style={{ flex: 1 }}>
              <BasicMessageFilterFieldTargetInput
                value={props.value.itemFieldTarget}
                onChange={(v) => props.onChange({ ...props.value, itemFieldTarget: v })}
              />
            </div>
          )}
        </div>
      </FormItem>
      <BasicMessageFilterOpInput
        value={props.value.testItemOp}
        onChange={(v) => props.onChange({ ...props.value, testItemOp: v })}
        isShowEnableToggle={false}
      />
    </div>
  );
}

export default TestOpArrayAllInput;
