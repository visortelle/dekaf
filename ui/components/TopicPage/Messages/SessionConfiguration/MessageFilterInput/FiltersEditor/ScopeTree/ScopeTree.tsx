import React, {useEffect, useRef} from "react";
import {
  NamespaceNode,
  TenantNode,
  TopicNode,
  TopicType
} from "../../../../Message/ReprocessMessage/types";
import s from "./ScopeTree.module.css";
import {isEqual} from "lodash";
import {NavigationNodesUtils} from "../../../../../../ui/Layout/NavigationTree/utils/navigation-nodes-utils";
import NavigationTree from "../../../../../../ui/Layout/NavigationTree/NavigationTree";
import {TreeNode, TreePath} from "../../../../../../ui/Layout/NavigationTree/utils/tree-path-utils";

type ScopeTreeProps = {
  scope: {
    tenant?: string;
    namespace?: string;
    topicName?: string;
    topicType?: TopicType;
  };
  setFilterScope: (scope: { tenant?: string; namespace?: string; topic?: string }) => void;
};


type SelectedNode = TenantNode | NamespaceNode | TopicNode | undefined;

const getInitialSelectedNode = (scope: { tenant?: string; namespace?: string; topicName?: string, topicType?: TopicType }): SelectedNode => {
  if (scope?.topicName) {
    return {
      tenant: scope?.tenant ?? '',
      namespace: scope?.namespace ?? '',
      topicName: scope?.topicName,
      topicType: scope?.topicType
    } as TopicNode;
  } else if (scope?.namespace) {
    return {
      tenant: scope?.tenant ?? '',
      namespace: scope?.namespace,
    } as NamespaceNode;
  } else if (scope?.tenant) {
    return {
      tenant: scope?.tenant,
    } as TenantNode;
  } else {
    return undefined;
  }
};

const ScopeTree: React.FC<ScopeTreeProps> = (props) => {
  const [selectedNode, setSelectedNode] =
    React.useState<SelectedNode>(getInitialSelectedNode(props.scope));

  const isSelected = (node: SelectedNode) => isEqual(selectedNode, node);

  const onNodeClick = (node: SelectedNode) => {
    setSelectedNode(node);
    node && props.setFilterScope(node);
  };

  const nodePathFromScope = (scope: { tenant?: string; namespace?: string; topicName?: string, topicType?: TopicType }): TreePath => {
    const path: TreePath = [];

    if (scope?.tenant) {
      path.push({
        type: 'tenant',
        name: scope.tenant
      } satisfies TreeNode);
    }

    if (scope?.namespace) {
      path.push({
        type: 'namespace',
        name: scope.namespace
      } satisfies TreeNode);
    }

    if (scope?.topicType && scope?.topicName) {
      if (scope?.topicType === 'persistent') {
        path.push({
          type: 'persistent-topic',
          name: scope.topicName
        } satisfies TreeNode);
      } else if (scope?.topicType === 'non-persistent') {
        path.push({
          type: 'non-persistent-topic',
          name: scope.topicName
        } satisfies TreeNode);
      }
    }

    return path;
  }

  return (
    <NavigationTree
      className={s.NavigationTree}
      selectedNodePath={nodePathFromScope(props.scope)}
      isTreeControlButtonsHidden={true}
      isInstanceNodeHidden={true}
      isToggleOnNodeClick={true}
      nodesRender={{
        instanceRender: () => <></>,
        tenantRender: (props) => {
          const renderedTenantNode: TenantNode = {
            tenant: props.tenant
          };

          return (
            <div className={s.TenantNodeGroup} onClick={() => onNodeClick(renderedTenantNode)}>
              <span className={s.NodeLinkText}>{props.tenant}</span>
              {isSelected(renderedTenantNode) && <div className={s.SelectedConfirmationBullet}></div>}
            </div>);
        },
        namespaceRender: (props) => {
          const renderedNamespaceNode: NamespaceNode = {
            tenant: props.tenant,
            namespace: props.namespace
          };

          return (
            <div className={s.NamespaceNodeGroup} onClick={() => onNodeClick(renderedNamespaceNode)}>
              <span className={s.NodeLinkText}>{NavigationNodesUtils.getNameFromPath(props.namespace)}</span>
              {isSelected(renderedNamespaceNode) && <div className={s.SelectedConfirmationBullet}></div>}
            </div>);
        },
        topicRender: (props) => {
          const renderedScopeTopicNode: TopicNode = {
            tenant: props.tenant,
            namespace: props.namespace,
            topicName: props.topic,
            topicType: props.topicType
          };

          return (
            <div className={s.TopicNodeGroup} onClick={() => onNodeClick(renderedScopeTopicNode)}>
              <span className={s.NodeLinkText}>{NavigationNodesUtils.getNameFromPath(props.topic)}</span>
              {isSelected(renderedScopeTopicNode) && <div className={s.SelectedConfirmationBullet}></div>}
            </div>);
        }
      }}
    />
  );
};

export default ScopeTree;