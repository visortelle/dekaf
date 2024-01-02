import { ReactElement } from "react";
import { ConsumerSessionConfig, MessageDescriptor } from "../types";
import { Th } from "../Th";
import { Sort, SortKey } from "../sort";
import { remToPx } from "../../rem-to-px";
import { Td } from "../Message/Td";
import { Coloring } from "../coloring";
import NoData from "../../NoData/NoData";
import { ValueProjection } from "./value-projections";

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

export function getValueProjectionThs(props: ValueProjectionThsProps): ValueProjectionTh[] {
  type GetThsProps = {
    thsProps: ValueProjectionThsProps,
    projections: ValueProjection[],
    reactKeyPrefix: string,
    type: {
      type: "sessionValueProjections"
    } | {
      type: "sessionTargetValueProjections",
      targetIndex: number
    }
  }
  const getThs = (props: GetThsProps) => {
    return props.projections.map((pr, i) => {
      const sortKey: SortKey = props.type.type === "sessionValueProjections" ? {
        type: "sessionValueProjection",
        projectionIndex: i
      } : {
        type: "sessionTargetValueProjection",
        targetIndex: props.type.targetIndex,
        projectionIndex: i
      };

      return {
        th: (
          <Th
            key={`${props.reactKeyPrefix}-${i}`}
            sort={props.thsProps.sort}
            setSort={props.thsProps.setSort}
            sortKey={sortKey}
            title={`${pr.shortName}`}
            help={<></>}
          />
        ),
        widthPx: remToPx(pr.width || defaultWidth)
      };
    });
  }

  const sessionThs = getThs({
    thsProps: props,
    projections: props.sessionConfig.valueProjectionList.projections,
    reactKeyPrefix: 'session-projection',
    type: { type: "sessionValueProjections" }

  });
  const sessionTargetThs = props.sessionConfig.targets.flatMap((target, i) =>
    getThs({
      thsProps: props,
      projections: target.valueProjectionList.projections,
      reactKeyPrefix: `session-target-${i}-projection`,
      type: {
        type: "sessionTargetValueProjections",
        targetIndex: i
      }
    })
  );

  return sessionThs.concat(sessionTargetThs);
}

export type GetValueProjectionTdsProps = {
  coloring: Coloring,
  sessionConfig: ConsumerSessionConfig,
  message: MessageDescriptor,
  valueProjectionThs: ValueProjectionTh[]
};

export function getValueProjectionTds(props: GetValueProjectionTdsProps): ReactElement[] {
  function getTdsFromTo(props: GetValueProjectionTdsProps): [number, number] {
    const targetIndex = props.message.sessionTargetIndex!;

    function getFrom(): number {
      let from: number = props.sessionConfig.valueProjectionList.projections.length;

      for (let i = 0; i < props.sessionConfig.targets.length; i++) {
        if (i === targetIndex) {
          return from;
        }

        from = from + props.sessionConfig.targets[i].valueProjectionList.projections.length;
      }

      return from;
    }

    const from = getFrom();
    const to = from + props.sessionConfig.targets[targetIndex].valueProjectionList.projections.length;

    return [from, to];
  }

  const sessionTds = props.sessionConfig.valueProjectionList.projections.map((_, i) => {
    return props.message.sessionValueProjectionListResult[i].displayValue;
  });

  const targetIndex = props.message.sessionTargetIndex!;
  const targetTds = props.sessionConfig.targets[targetIndex].valueProjectionList.projections.map((_, i) => {
    return props.message.sessionTargetValueProjectionListResult[i].displayValue;
  });


  const targetTdsFromTo = getTdsFromTo(props);
  const tds = Array.from(Array(props.valueProjectionThs.length)).map((_, i) => {
    let displayValue: ReactElement | undefined = <NoData />;

    if (i < sessionTds.length) {
      displayValue = <>{sessionTds[i]}</>;
    } else if (i >= targetTdsFromTo[0] && i <= targetTdsFromTo[1]) {
      displayValue = <>{targetTds[i - targetTdsFromTo[0]]}</>;
    }

    return (
      <Td
        key={`projection-${i}`}
        width={`${props.valueProjectionThs[i].widthPx}px`}
        coloring={props.coloring}
      >
        {displayValue}
      </Td>
    );
  });

  return tds;
}
