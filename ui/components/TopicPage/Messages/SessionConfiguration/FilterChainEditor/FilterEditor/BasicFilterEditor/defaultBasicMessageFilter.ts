import { BasicMessageFilter } from "../../../../basic-message-filter-types";
import { v4 as uuid } from "uuid";

export const defaultBasicMessageFilter: BasicMessageFilter = {
  type: "BasicMessageFilter",
  target: {
    type: "BasicMessageFilterTarget",
    target: {
      type: "BasicMessageFilterValueTarget",
    }
  },
  op: {
    "type": "BasicMessageFilterOp",
    isEnabled: true,
    isNegated: false,
    op: {
      type: "AnyTestOp",
      op: {
        type: "TestOpIsDefined",
      }
    },
    reactKey: uuid()
  }
}
