import {TestOpMatchesJSON} from "../../../../../../../basic-message-filter-types";
import React from "react";
import s from "./TestOpMatchesJSONInput.module.css";
import FormItem from "../../../../../../../../ConfigurationTable/FormItem/FormItem";
import CodeEditor from "../../../../../../../../CodeEditor/CodeEditor";

export type TestOpMatchesJSONInputProps = {
  value: TestOpMatchesJSON,
  onChange: (v: TestOpMatchesJSON) => void,
};

const TestOpMatchesJSONInput: React.FC<TestOpMatchesJSONInputProps> = (props) => {
  return (
    <div className={s.TestOpMatchesJSONInput}>
      <FormItem>
        <CodeEditor
          value={props.value.matchesJson}
          onChange={(v) => props.onChange({ ...props.value, matchesJson: v || '' })}
          height={60}
          language='javascript'
        />
      </FormItem>
    </div>
  );
}

export default TestOpMatchesJSONInput;