import {TestOpMatchesJson} from "../../../../../../../basic-message-filter-types";
import React from "react";
import s from "./TestOpMatchesJsonInput.module.css";
import FormItem from "../../../../../../../../ConfigurationTable/FormItem/FormItem";
import CodeEditor from "../../../../../../../../CodeEditor/CodeEditor";

export type TestOpMatchesJsonInputProps = {
  value: TestOpMatchesJson,
  onChange: (v: TestOpMatchesJson) => void,
};

const TestOpMatchesJsonInput: React.FC<TestOpMatchesJsonInputProps> = (props) => {
  return (
    <div className={s.TestOpMatchesJsonInputProps}>
      <FormItem>
        <CodeEditor
          value={props.value.matchesJson}
          onChange={(v) => props.onChange({ ...props.value, matchesJson: v || '' })}
          height={80}
          language='json'
        />
      </FormItem>
    </div>
  );
}

export default TestOpMatchesJsonInput;