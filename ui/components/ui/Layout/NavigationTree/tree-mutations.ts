import cloneDeep from "lodash/cloneDeep";
import { NamespaceTreeNode, TenantTreeNode, TopicTreeNode, Tree, TreeNode, TreePath, getRootLabelName, getTopicPartitioning } from "./TreeView";
import { detectPartitionedTopics } from "../../../NamespacePage/Topics/Topics";

export function setTenants(props: { tree: Tree; tenants: string[] }): Tree {
  let _tree = cloneDeep(props.tree);
  _tree.subForest = props.tenants.map((tenant) => ({
    rootLabel: { type: "tenant", tenant },
    subForest: [],
  }));
  return _tree;
}

export function setTenantNamespaces(props: {
  tree: Tree;
  tenant: string;
  namespaces: string[];
}): Tree {
  let _tree = cloneDeep(props.tree);
  _tree.subForest = _tree.subForest.map((tenantNode) => {
    if (getRootLabelName(tenantNode.rootLabel) !== props.tenant) {
      return tenantNode;
    }

    return {
      ...tenantNode,
      subForest: props.namespaces.map((namespace) => ({
        rootLabel: {
          type: "namespace",
          tenant: (tenantNode.rootLabel as TenantTreeNode).tenant,
          namespace
        },
        subForest: [],
      })),
    };
  });
  return _tree;
}

export function setNamespaceTopics(props: {
  tree: Tree;
  tenant: string;
  namespace: string;
  persistentTopics: TopicTreeNode[];
  nonPersistentTopics: TopicTreeNode[];
}): Tree {
  let _tree = cloneDeep(props.tree);
  _tree.subForest = _tree.subForest.map((tenantNode) => {
    if (getRootLabelName(tenantNode.rootLabel) !== props.tenant) {
      return tenantNode;
    }

    return {
      ...tenantNode,
      subForest: tenantNode.subForest.map((namespaceNode) => {
        if (getRootLabelName(namespaceNode.rootLabel) !== props.namespace) {
          return namespaceNode;
        }

        const allTopics = [...props.persistentTopics, ...props.nonPersistentTopics];

        return {
          ...namespaceNode,
          subForest: allTopics.map(t => {
            return {
              rootLabel: t,
              subForest: []
            }
          }),
        };
      }),
    };
  });
  return _tree;
}

type ExpandedPaths = TreePath[];
export function expandDeep(
  tree: Tree,
  treePath: TreePath,
  expandedPaths: ExpandedPaths
): ExpandedPaths {
  return [
    ...expandedPaths,
    treePath,
    ...tree.subForest
      .map((subTree) =>
        expandDeep(subTree, treePath.concat([subTree.rootLabel]), expandedPaths)
      )
      .flat(),
  ];
}
