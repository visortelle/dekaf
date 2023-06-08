import React from 'react';
import s from './ClusterPage.module.css'
import Cluster from './Cluster/Cluster';

export type ClusterPageView  = 'overview';

export type ClusterPageProps = {
  cluster: string;
  view: ClusterPageView;
};

const ClusterPage: React.FC<ClusterPageProps> = (props) => {
  return (
    <div className={s.ClusterPage}>
      <Cluster cluster={props.cluster} />
    </div>
  );
}

export default ClusterPage;
