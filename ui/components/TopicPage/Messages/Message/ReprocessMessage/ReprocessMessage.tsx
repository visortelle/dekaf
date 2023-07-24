import {MessageDescriptor} from "../../types";
import React from "react";
import {FilterEditor} from "../../../../ui/Table/FiltersToolbar/FiltersToolbar";
import {StringFilterDescriptor, StringFilterValue} from "../../../../ui/Table/filters/types";
import NavigationTree from "../../../../ui/Layout/NavigationTree/NavigationTree";

export type ReprocessMessageProps = {
  message: MessageDescriptor;
}

const ReprocessMessage: React.FC<ReprocessMessageProps> = (props) => {
  const [filter, setFilter] = React.useState<string>("");

  return (
    <div>
      <div>
        <div>Topic</div>
{/*        <FilterEditor
          value={{state: "active", value: {type: "string", value: filter}}}
          onChange={(v) => setFilter((v.value as StringFilterValue).value)}
          filterDescriptor={
            {type: "string", defaultValue: {type: "string", value: ""}} as StringFilterDescriptor
          }
        />*/}

        <NavigationTree selectedNodePath={[]} isTreeControlButtonsHidden={true} />
      </div>
      <div>

      </div>
    </div>
  );
}

export default ReprocessMessage;
