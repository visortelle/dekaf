import React from 'react';
import s from './TestOpArrayAllInput.module.css'
import { BasicMessageFilterFieldTarget, TestOpArrayAll } from '../../../../../../../basic-message-filter-types';
import BasicMessageFilterOpInput from '../../BasicMessageFilterOpInput';
import BasicMessageFilterFieldTargetInput from '../../../BasicMessageFilterTargetInput/BasicMessageFilterFieldTargetInput/BasicMessageFilterFieldTargetInput';
import Toggle from '../../../../../../../../../ui/Toggle/Toggle';

export type TestOpArrayAllInputProps = {
  value: TestOpArrayAll,
  onChange: (v: TestOpArrayAll) => void
};

const TestOpArrayAllInput: React.FC<TestOpArrayAllInputProps> = (props) => {
  return (
    <div className={s.TestOpArrayAllInput}>
      {props.value.itemFieldTarget?.type === "BasicMessageFilterFieldTarget" && (
        <BasicMessageFilterFieldTargetInput
          value={props.value.itemFieldTarget}
          onChange={(v) => props.onChange({ ...props.value, itemFieldTarget: v })}
        />
      )}
      <Toggle
        value={Boolean(props.value.itemFieldTarget)}
        onChange={(v) => {
          let itemFieldTarget: BasicMessageFilterFieldTarget | undefined = undefined;

          if (v) {
            itemFieldTarget = { type: "BasicMessageFilterFieldTarget", jsonFieldSelector: undefined };
          }

          props.onChange({ ...props.value, itemFieldTarget });
        }}
      />
      <BasicMessageFilterOpInput
        value={props.value.testItemOp}
        onChange={(v) => props.onChange({ ...props.value, testItemOp: v })}
        isShowEnableToggle={false}
      />
    </div>
  );
}

export default TestOpArrayAllInput;
