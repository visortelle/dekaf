import { TestOpEqualsJson } from "../../../../../../../basic-message-filter-types";
import React from "react";
import s from "./TestOpEqualsJsonInput.module.css";
import FormItem from "../../../../../../../../ConfigurationTable/FormItem/FormItem";
import CodeEditor from "../../../../../../../../CodeEditor/CodeEditor";

export type TestOpEqualsJsonInputProps = {
  value: TestOpEqualsJson,
  onChange: (v: TestOpEqualsJson) => void,
  isReadOnly?: boolean
};

const TestOpEqualsJsonInput: React.FC<TestOpEqualsJsonInputProps> = (props) => {
  return (
    <div className={s.TestOpMatchesJsonInputProps}>
      <FormItem>
        <CodeEditor
          value={props.value.equalsJson}
          onChange={(v) => props.onChange({ ...props.value, equalsJson: v || '' })}
          height={80}
          language='json'
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpEqualsJsonInput;
