import {TestOpContainsJSON} from "../../../../../../../basic-message-filter-types";
import React from "react";
import s from "./TestOpContainsJSONInput.module.css";
import FormItem from "../../../../../../../../ConfigurationTable/FormItem/FormItem";
import CodeEditor from "../../../../../../../../CodeEditor/CodeEditor";

export type TestOpContainsJSONInputProps = {
  value: TestOpContainsJSON,
  onChange: (v: TestOpContainsJSON) => void,
};

const TestOpContainsJSONInput: React.FC<TestOpContainsJSONInputProps> = (props) => {
  return (
    <div className={s.TestOpContainsJSONInput}>
      <FormItem>
        <CodeEditor
          value={props.value.containsJson}
          onChange={(v) => props.onChange({ ...props.value, containsJson: v || '' })}
          height={60}
          language='javascript'
        />
      </FormItem>
    </div>
  );
}

export default TestOpContainsJSONInput;