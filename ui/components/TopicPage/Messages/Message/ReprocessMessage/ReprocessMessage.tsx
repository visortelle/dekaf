import {MessageDescriptor} from "../../types";
import React, {useEffect} from "react";
import {TreePath} from "../../../../ui/Layout/NavigationTree/utils/tree-path-utils";
import s from "./ReprocessMessage.module.css";

import NavigationTree from "../../../../ui/Layout/NavigationTree/NavigationTree";
import Button from "../../../../ui/Button/Button";

import arrowLeft from "../icons/arrow-left.svg";
import Link from "../../../../ui/Link/Link";
import {routes} from "../../../../routes";
import {NavigationNodesUtils} from "../../../../ui/Layout/NavigationTree/utils/navigation-nodes-utils";
import * as Modals from "../../../../app/contexts/Modals/Modals";
import * as AsyncTasks from "../../../../app/contexts/AsyncTasks";
import {isEqual} from "lodash";
import {TopicNode} from "./types";

export type ReprocessMessageProps = {
  message: MessageDescriptor;
  selectedNodePath: TreePath;
}

export type ReprocessMessagePayload = {
  message: MessageDescriptor;
  node: TopicNode;
}

const ReprocessMessage: React.FC<ReprocessMessageProps> = (props) => {
  const modals = Modals.useContext();
  const asyncTasks = AsyncTasks.useContext();
  const [node, setNode] = React.useState<TopicNode>({
    tenant: '',
    namespace: '',
    topicName: '',
    topicType: 'persistent',
  });
  const nodeRef = React.useRef<TopicNode>(node);

  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  return (
    <div className={s.ReprocessMessage}>
      <div className={s.ReprocessMessageGroup}>
      <span className={s.ReprocessMessageDescription}>
        Message reprocessing enables you to edit and subsequently resend a message either to the original topic or a different one. During the editing process, you'll have the ability to modify all the message parameters.
      </span>
        <div className={s.NavigationTreeTitle}>
          <strong>Target topic</strong>
        </div>
        <NavigationTree
          className={s.NavigationTree}
          selectedNodePath={[]}
          isTreeControlButtonsHidden={true}
          isInstanceNodeHidden={true}
          isToggleOnNodeClick={true}
          nodesRender={{
            instanceRender: (props) => <></>,
            tenantRender: (props) => <div>
              <span className={s.NodeLinkText}>{props.tenant}</span>
            </div>,
            namespaceRender: (props) => <div>
              <span className={s.NodeLinkText}>{props.namespace}</span>
            </div>,
            topicRender: (props) => {
              const renderedTopicNode = {
                tenant: props.tenant,
                namespace: props.namespace,
                topicName: props.topic,
                topicType: props.topicType
              };
              const isTopicSelected = isEqual(nodeRef.current, renderedTopicNode);

              return (
                <div className={s.TopicNodeGroup} onClick={() => setNode(renderedTopicNode)}>
                  <span className={s.NodeLinkText}>{NavigationNodesUtils.getNameFromPath(props.topic)}</span>
                  {isTopicSelected && <div className={s.SelectedConfirmationBullet}></div>}
                </div>);
            }
          }}
        />
      </div>
      <div className={s.ReprocessMessageButtons}>
        <Link
          onClick={() => {
            const reprocessPayload: ReprocessMessagePayload = {
              message: props.message,
              node: node,
            };
            asyncTasks.startTask('reprocess-message', JSON.stringify(reprocessPayload));

            modals.pop();
          }}
          to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: node.tenant, namespace: node.namespace, topic: node.topicName, topicType: node.topicType })}
        >
          <Button
            onClick={() => undefined}
            type={"primary"}
            text={"Edit and produce"}
            svgIconFromRight={true}
            svgIcon={arrowLeft}
          />
        </Link>

      </div>
    </div>
  );
}

export default ReprocessMessage;
