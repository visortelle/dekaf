import { ReactElement } from "react";
import { ConsumerSessionConfig, MessageDescriptor } from "../types";
import { Th } from "../Th";
import { Sort } from "../sort";
import { remToPx } from "../../rem-to-px";
import { Td, TdProps } from "../Message/Td";
import { Coloring } from "../coloring";
import NoData from "../../NoData/NoData";

const defaultWidth = 100 as const;

export type ValueProjectionThsProps = {
  sessionConfig: ConsumerSessionConfig,
  sort: Sort,
  setSort: (v: Sort) => void
};

export type ValueProjectionTh = {
  th: ReactElement,
  widthPx: number
}

export const getValueProjectionThs = (props: ValueProjectionThsProps): ValueProjectionTh[] => {
  const globalThs = props.sessionConfig.valueProjectionList.projections.map((pr, i) => {
    return {
      th: (
        <Th
          key={i}
          sort={props.sort}
          setSort={props.setSort}
          title={`${pr.shortName}`}
          help={<></>}
        />
      ),
      widthPx: remToPx(pr.width || defaultWidth)
    };
  });

  return globalThs;
}

export type GetValueProjectionTdsProps = {
  coloring: Coloring,
  sessionConfig: ConsumerSessionConfig,
  message: MessageDescriptor,
  valueProjectionThs: ValueProjectionTh[]
};

export const getValueProjectionTds = (props: GetValueProjectionTdsProps): ReactElement[] => {
  const globalTds = props.sessionConfig.valueProjectionList.projections.map((pr, i) => {
    const displayValue = props.message.sessionValueProjectionListResult[i].displayValue
    return (
      <Td
        key={`global-${i}`}
        width={`${props.valueProjectionThs[i].widthPx}px`}
        coloring={props.coloring}
      >
        {displayValue === undefined ? <NoData /> : displayValue}
      </Td>
    );
  });

  return globalTds;
}

