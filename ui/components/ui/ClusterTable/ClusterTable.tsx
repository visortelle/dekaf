import React from "react";
import sts from "../SimpleTable/SimpleTable.module.css";
import {ColumnKey} from "../../InstancePage/Overview/Clusters/Cluster/Cluster";
import NoData from "../NoData/NoData";
import ClusterRow from "./ClusterRow";

export type ClusterTableProps = {
  clusterRows: Record<ColumnKey, { data: React.ReactNode, label: string }>
  help: Record<ColumnKey, React.ReactNode>
}

const ClusterTable: React.FC<ClusterTableProps> = ({clusterRows, help}) => {
  return (
    <table className={sts.Table}>
      <tbody>
      {Object.entries(clusterRows).map(([key, {data, label}]) => (
        <ClusterRow
          key={key}
          label={label}
          data={data}
          tooltipHelp={help[key as ColumnKey] || <NoData/>}
        />
      ))}
      </tbody>
    </table>
  );
}

export default ClusterTable;
