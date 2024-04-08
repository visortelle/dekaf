import React from "react";
import {PulsarTopicPersistency} from "../../pulsar/pulsar-resources";
import s from "./Overview.module.css";
import SubscriptionPropertiesEditor from "./SubscriptionPropertiesEditor/SubsctiptionPropertiesEditor";
import Statistics from "./Statistics/Statistics";

type OverviewProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
}

const Overview: React.FC<OverviewProps> = (props) => {
  return (
    <div className={s.Overview}>
      <div className={s.LeftPanel}>
        <Statistics
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
          subscription={props.subscription}
        />
      </div>

      <div className={s.RightPanel}>
        <div style={{marginBottom: '24rem'}}>
          <SubscriptionPropertiesEditor
            tenant={props.tenant}
            namespace={props.namespace}
            topic={props.topic}
            topicPersistency={props.topicPersistency}
            subscription={props.subscription}
          />
        </div>
      </div>
    </div>
  );
}

export default Overview;