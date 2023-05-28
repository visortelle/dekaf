import React from "react";
import s from "./Clusters.module.css";
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import { swrKeys } from "../../../swrKeys";
import useSWR from "swr";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import Link from "../../../ui/Link/Link";
import { routes } from "../../../routes";
import sts from "../../../ui/SimpleTable/SimpleTable.module.css";

const Clusters: React.FC = () => {
  const { notifyError } = Notifications.useContext();
  const { clustersServiceClient } = GrpcClient.useContext();

  const { data: clusters, error: clustersError } = useSWR(
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

      return res.getClustersList();
    }
  );

  if (clustersError) {
    notifyError(`Unable to get clusters list. ${clustersError}`);
  }

  return (
    <div className={s.Clusters}>
      <table className={sts.Table}>
        <thead>
          <tr className={sts.Row}>
            <th className={sts.Cell}>Cluster</th>
          </tr>
        </thead>
        <tbody>
          {clusters?.map((cluster) => (
            <tr key={cluster} className={sts.Row}>
              <td className={sts.Cell}>
                <Link to={routes.instance.clusters.cluster._.get({ cluster })}>
                  {cluster}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Clusters;
