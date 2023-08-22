import React from "react";
import s from "./Clusters.module.css";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import { swrKeys } from "../../../swrKeys";
import useSWR from "swr";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import Cluster from "./Cluster/Cluster";
import NothingToShow from "../../../ui/NothingToShow/NothingToShow";

type ClustersProps = {
  clusters: string[] | undefined;
  isLoading: boolean;
};

const Clusters: React.FC<ClustersProps> = ({clusters, isLoading}) => {
  if (clusters === undefined || clusters?.length === 0) {
    return <NothingToShow reason={isLoading ? 'loading-in-progress' : 'no-items-found'} />;
  }

  return (
    <div className={s.Clusters}>
      {clusters?.map((cluster) => {
        return (
          <Cluster
            key={cluster}
            cluster={cluster}
          />
        );
      })}
    </div>
  );
};

export default Clusters;
