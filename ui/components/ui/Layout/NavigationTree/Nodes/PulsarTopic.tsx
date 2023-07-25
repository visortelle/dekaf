import React from "react";
import Link from "../../../Link/Link";
import {routes} from "../../../../routes";
import s from "../NavigationTree.module.css";
import {NodesUtils} from "../utils/nodes-utils";

export type PulsarTopicProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  isFetchData: boolean;
  customRender?: (props: PulsarTopicProps) => React.ReactElement;
}
export const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  const topicName = NodesUtils.getTopicName(props.topic);

  return props.customRender?.(props) || (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: props.tenant, namespace: props.namespace, topic: topicName, topicType: props.topicType })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{topicName}</span>
    </Link>
  );
}
