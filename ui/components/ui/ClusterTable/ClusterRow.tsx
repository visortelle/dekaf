import React from "react";
import sts from "../SimpleTable/SimpleTable.module.css";
import s from "../../InstancePage/Overview/Clusters/Cluster/Cluster.module.css";
import {tooltipId} from "../Tooltip/Tooltip";
import ReactDOMServer from "react-dom/server";
import TooltipComponent from "../Tooltip/TooltipComponent";

export type ClusterRowProps = {
  label: string,
  data: React.ReactNode,
  tooltipHelp: React.ReactNode,
};

const ClusterRow: React.FC<ClusterRowProps> = ({label, data, tooltipHelp}) => {
  return (
    <tr className={`${sts.Row} ${s.Row}`}>
      <td className={`${sts.HighlightedCell} ${s.HighlightedCell}`}>
        <TooltipComponent
          tooltipHelp={tooltipHelp}
        >
          {label}
        </TooltipComponent>
      </td>
      <td className={`${sts.Cell} ${s.Cell}`}>{data}</td>
    </tr>
  );
}

export default ClusterRow;
