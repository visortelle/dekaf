import React from "react";
import {PulsarTopicPersistency} from "../../pulsar/pulsar-resources";

type OverviewProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
}

const Overview: React.FC<OverviewProps> = (props) => {
  return (
    <div>
      Overview
    </div>
  );
}

export default Overview;