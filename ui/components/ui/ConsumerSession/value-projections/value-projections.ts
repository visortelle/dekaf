import { BasicMessageFilterTarget } from "../basic-message-filter-types";

export type ValueProjection = {
  isEnabled: boolean,
  target: BasicMessageFilterTarget,
  shortName: string,
  width: number | undefined,
};

export type ValueProjectionList = {
  isEnabled: boolean,
  projections: ValueProjection[]
};
