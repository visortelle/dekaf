import { isEqual, uniqWith } from 'lodash';
import { DetectPartitionedTopicsResult } from '../../../NamespacePage/Topics/Topics';

export type Tree = {
  subForest: Tree[];
  rootLabel: TreeNode;
}

export type TopicPartitioning = {
  type: 'partitioned',
} | {
  type: 'non-partitioned'
} | {
  type: 'partition'
};

export function getTopicPartitioning(topicFqn: string, detectPartitionedTopicsResult: DetectPartitionedTopicsResult): TopicPartitioning {
  const { partitionedTopics, nonPartitionedTopics } = detectPartitionedTopicsResult;

  const maybePartitioned = partitionedTopics.find(t => t.topicFqn === topicFqn);
  if (maybePartitioned !== undefined) {
    return {
      type: 'partitioned'
    }
  }

  if (nonPartitionedTopics.find(t => t.topicFqn === topicFqn) !== undefined) {
    return {
      type: 'non-partitioned'
    }
  }

  return { type: 'partition' }
}

export type TopicPersistency = 'persistent' | 'non-persistent';

export type InstanceTreeNode = {
  type: 'instance',
  name: string
};

export type TenantTreeNode = {
  type: 'tenant',
  tenant: string,
};

export type NamespaceTreeNode = {
  type: 'namespace',
  tenant: string,
  namespace: string
};

export type TopicTreeNode = {
  type: 'topic',
  partitioning: TopicPartitioning,
  persistency: TopicPersistency,
  tenant: string,
  namespace: string,
  topic: string,
  topicFqn: string
};

export type TopicPartitionTreeNode = {
  type: 'topic-partition',
  partitioning: TopicPartitioning,
  persistency: TopicPersistency,
  tenant: string,
  namespace: string,
  topic: string,
  partition: string,
  topicFqn: string
};

export type TreeNode = InstanceTreeNode | TenantTreeNode | NamespaceTreeNode | TopicTreeNode | TopicPartitionTreeNode;

type TreeNodeType = TreeNode['type'];

export type TreePath = TreeNode[];

export const treePath = {
  getTenant: (path: TreePath): TenantTreeNode | undefined => path.find(node => node.type === "tenant") as TenantTreeNode | undefined,
  getNamespace: (path: TreePath): NamespaceTreeNode | undefined => path.find(node => node.type === "namespace") as NamespaceTreeNode | undefined,
  getTopic: (path: TreePath): TopicTreeNode | undefined => path.find(node => node.type === "topic") as TopicTreeNode | undefined,
  getTopicPartition: (path: TreePath): TopicPartitionTreeNode | undefined => path.find(node => node.type === "topic-partition") as TopicPartitionTreeNode | undefined,

  isTenant: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "tenant",
  isNamespace: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "namespace",
  isTopic: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "topic",
  isTopicPartition: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "topic-partition",

  getType: (path: TreePath): TreeNodeType | undefined => {
    if (treePath.isTenant(path)) return "tenant";
    if (treePath.isNamespace(path)) return "namespace";
    if (treePath.isTopic(path)) return "topic";
    if (treePath.isTopicPartition(path)) return "topic-partition";
  },

  isAllAncestorsExpanded: (expandedPaths: TreePath[], path: TreePath) => {
    const ancestorNodes = path.slice(0, path.length - 1);
    const ancestorPaths = ancestorNodes.map((_, i)=> path.slice(0, i + 1));
    return ancestorPaths.every(ap => treePath.hasPath(expandedPaths, ap))
  },
  hasAncestorPath: (paths: TreePath[], path: TreePath) => paths.some(p => treePath.arePathsEqual(p, path.slice(0, path.length - 1))),
  hasPath: (paths: TreePath[], path: TreePath) => paths.some(p => treePath.arePathsEqual(p, path)),
  uniquePaths: (paths: TreePath[]) => uniqWith(paths, treePath.arePathsEqual),
  arePathsEqual: (pathA: TreePath, pathB: TreePath) => {
    if (pathA.length !== pathB.length) {
      return false;
    }

    return pathA.every((node, i) => treePath.areNodesEqual(node, pathB[i]));
  },
  areNodesEqual: (nodeA: TreeNode, nodeB: TreeNode) => {
    function normalizeTreeNode(node: TreeNode): { type: TreeNodeType, fqn: string } {
      switch (node.type) {
        case "instance": return { type: "instance", fqn: "unknown" };
        case "tenant": return { type: "tenant", fqn: node.tenant };
        case "namespace": return { type: "namespace", fqn: `${node.tenant}/${node.namespace}` };
        case "topic": return { type: "topic", fqn: `${node.persistency}://${node.tenant}/${node.namespace}/${node.topic}` };
        case "topic-partition": return { type: "topic-partition", fqn: `${node.persistency}://${node.tenant}/${node.namespace}/${node.topic}-${node.partition}` };
      }
    }

    const a = normalizeTreeNode(nodeA);
    const b = normalizeTreeNode(nodeB);

    return isEqual(a, b);
  },

  isPathExpanded: (paths: TreePath[], path: TreePath) => paths.some((p) => treePath.arePathsEqual(path, p)),
  expandAncestors: (path: TreePath): TreePath[] => {
    // Thank you, Copilot :)
    const ancestors = [];
    for (let i = 0; i < path.length - 1; i++) {
      ancestors.push(path.slice(0, i + 1));
    }
    return ancestors;
  }
}

export type FlattenTreeNode = {
  type: TreeNodeType;
  name: string;
  path: TreePath;
}

export type TreeToFlattenTreeProps = {
  tree: Tree;
  path: TreePath;
  getPathPart: (tree: Tree) => TreeNode;
  plainTree: FlattenTreeNode[];
  rootLabel: TreeNode;
  getVisibility: (tree: Tree, path: TreePath) => {
    tree: boolean,
    rootLabel: boolean,
    subForest: boolean
  },
  alterTree: (tree: Tree, path: TreePath) => Tree,
}

export function getRootLabelName(treeNode: TreeNode): string {
  switch (treeNode.type) {
    case "instance":
      return treeNode.name;
    case "tenant":
      return treeNode.tenant;
    case "namespace":
      return treeNode.namespace;
    case "topic":
      return treeNode.topic;
    case "topic-partition":
      return treeNode.partition;
  }
}
function treeToFlattenTree(props: TreeToFlattenTreeProps): FlattenTreeNode[] {
  const { alterTree, getVisibility } = props;
  const tree = alterTree(props.tree, props.path);
  const visibility = getVisibility(tree, props.path);

  if (!visibility.tree) {
    return props.plainTree;
  }

  const rootLabelNode: FlattenTreeNode | undefined = visibility.rootLabel ? {
    type: props.rootLabel.type,
    name: getRootLabelName(props.rootLabel),
    path: props.path
  } : undefined;

  const subForestNodes: FlattenTreeNode[] = tree.subForest.map<FlattenTreeNode[]>((tree) => {
    const pathPart = props.getPathPart(tree);
    const path = props.path.concat([pathPart]);

    const t = treeToFlattenTree({
      ...props,
      tree,
      path,
      rootLabel: tree.rootLabel
    });

    return t;
  }).flat();

  return [rootLabelNode].concat(subForestNodes).filter(node => node !== undefined) as FlattenTreeNode[];
}

export default treeToFlattenTree;
