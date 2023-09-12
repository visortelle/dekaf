import {TestOpContainsJson} from "../../../../../../../basic-message-filter-types";
import React from "react";
import s from "./TestOpContainsJsonInput.module.css";
import FormItem from "../../../../../../../../ConfigurationTable/FormItem/FormItem";
import CodeEditor from "../../../../../../../../CodeEditor/CodeEditor";

export type TestOpContainsJsonInputProps = {
  value: TestOpContainsJson,
  onChange: (v: TestOpContainsJson) => void,
};

const TestOpContainsJsonInput: React.FC<TestOpContainsJsonInputProps> = (props) => {
  return (
    <div className={s.TestOpContainsJsonInput}>
      <FormItem>
        <CodeEditor
          value={props.value.containsJson}
          onChange={(v) => props.onChange({ ...props.value, containsJson: v || '' })}
          height={80}
          language='json'
        />
      </FormItem>
    </div>
  );
}

export default TestOpContainsJsonInput;