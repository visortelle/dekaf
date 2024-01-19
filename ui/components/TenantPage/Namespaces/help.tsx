import { ReactElement } from "react";
import { ColumnKey } from "./Namespaces";

export const help: Record<ColumnKey, ReactElement> = {
  namespaceName: <div>The name of the namespace.</div>,
  topicsCount: <div>The number of partitioned and non-partitioned topics that the namespace has. <br/> (Does not include partitions of partitioned topics.)</div>,
  topicsCountIncludingPartitions: <div>The overall number of topics in this namespace includes both partitioned and non-partitioned topics, as well as their respective partitions.</div>,
};
