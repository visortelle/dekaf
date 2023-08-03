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
  setClusters: React.Dispatch<React.SetStateAction<string[] | undefined>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
}

const Clusters: React.FC<ClustersProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { clustersServiceClient } = GrpcClient.useContext();

  const { data: clusters, error: clustersError, isLoading } = useSWR(
    swrKeys.pulsar.clusters._(),
    async () => {
      const res = await clustersServiceClient.getClusters(
        new pb.GetClustersRequest(),
        null
      );

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(
          `Unable to get clusters list. ${res.getStatus()?.getMessage()}`
        );
        return [];
      }

      let clusterList = res.getClustersList();
      props.setClusters(clusterList);
      props.setActiveTab(clusterList.at(0) ?? "")

      return clusterList;
    }
  );

  props.setIsLoading(isLoading);

  if (clustersError) {
    notifyError(`Unable to get clusters list. ${clustersError}`);
  }

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
