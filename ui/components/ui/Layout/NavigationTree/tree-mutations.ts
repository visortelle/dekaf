import cloneDeep from "lodash/cloneDeep";
import { TenantTreeNode, TopicPartitionTreeNode, TopicTreeNode, Tree, TreeNode, TreePath, getRootLabelName } from "./TreeView";

export function updateTenants(props: { tree: Tree; tenants: string[] }): Tree {
  let _tree = cloneDeep(props.tree);
  _tree.subForest = props.tenants.map((tenant) => ({
    rootLabel: { type: "tenant", tenant },
    subForest: [],
  }));
  return _tree;
}

export function updateTenantNamespaces(props: {
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

export function updateNamespaceTopics(props: {
  tree: Tree;
  tenant: string;
  namespace: string;
  persistentTopics: (TopicTreeNode | TopicPartitionTreeNode)[];
  nonPersistentTopics: (TopicTreeNode | TopicPartitionTreeNode)[];
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
          subForest: allTopics.filter(t => t.partitioning.type !== "partition").map(t => {
            const isPartitionedTopic = t.partitioning.type === "partitioned";
            const partitions: Tree[] = allTopics
              .filter(t2 => t2.partitioning.type === "partition" && t2.topic === t.topic)
              .map(t3 => ({
                rootLabel: t3,
                subForest: [],
              }));

            return {
              rootLabel: t,
              subForest: isPartitionedTopic ? partitions : []
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
