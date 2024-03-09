import { TestOpContainsJson } from "../../../../../../../basic-message-filter-types";
import React from "react";
import s from "./TestOpContainsJsonInput.module.css";
import FormItem from "../../../../../../../../ConfigurationTable/FormItem/FormItem";
import StringFilterInput from "../../../../../../../../Input/StringFilterInput/StringFilterInput";

export type TestOpContainsJsonInputProps = {
  value: TestOpContainsJson,
  onChange: (v: TestOpContainsJson) => void,
  isReadOnly?: boolean
};

const TestOpContainsJsonInput: React.FC<TestOpContainsJsonInputProps> = (props) => {
  return (
    <div className={s.TestOpContainsJsonInput}>
      <FormItem>
        <StringFilterInput
          size='small'
          value={props.value.containsJson}
          onChange={(v) => props.onChange({ ...props.value, containsJson: v })}
          isMatchCase={!props.value.isCaseInsensitive}
          onIsMatchCaseChange={v => props.onChange({ ...props.value, isCaseInsensitive: !v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpContainsJsonInput;
