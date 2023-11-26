import { BasicMessageFilter } from "../../../../basic-message-filter-types";

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
    }
  }
}
