import { BasicMessageFilterTarget } from "../../basic-message-filter-types";

export type ValueProjection = {
  target: BasicMessageFilterTarget,
  shortName: string,
  width: number | undefined,
};

export type ValueProjectionList = {
  projections: ValueProjection[]
};
