import React from "react";
import sts from "../SimpleTable/SimpleTable.module.css";
import s from "../../InstancePage/Overview/Clusters/Cluster/Cluster.module.css";
import {tooltipId} from "../Tooltip/Tooltip";
import ReactDOMServer from "react-dom/server";

export type ClusterRowProps = {
  label: string,
  data: React.ReactNode,
  tooltipHelp: React.ReactNode,
};

const ClusterRow: React.FC<ClusterRowProps> = ({label, data, tooltipHelp}) => {
  return (
    <tr className={`${sts.Row} ${s.Row}`}>
      <td className={`${sts.HighlightedCell} ${s.HighlightedCell}`}>
        <div
          data-tooltip-id={tooltipId}
          data-tooltip-html={ReactDOMServer.renderToStaticMarkup(<>{tooltipHelp}</>)}
        >
          {label}
        </div>
      </td>
      <td className={`${sts.Cell} ${s.Cell}`}>{data}</td>
    </tr>
  );
}

export default ClusterRow;
