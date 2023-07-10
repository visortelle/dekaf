import { ReactNode } from "react";
import { ColumnKey } from "./Namespaces";

export const help: Record<ColumnKey, ReactNode> = {
  namespaceName: <div>The name of the namespace.</div>,
  topicsCount: <div>The number of partitioned and non-partitioned topics that the namespace has. <br/> (Does not include partitions of partitioned topics.)</div>,
  topicsCountIncludingPartitions: <div>The overall number of topics in this namespace includes both partitioned and non-partitioned topics, as well as their respective partitions.</div>,
  properties: <div>Custom metadata associated with a namespace. <br/> They serve as annotations or labels that provide additional information about the namespace, such as its environment, owner, or any important notes. <br/> They are useful for organization, tracking, and potential automation tasks.</div>
};
