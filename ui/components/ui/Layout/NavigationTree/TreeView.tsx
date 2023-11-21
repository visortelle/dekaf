import { isEqual, uniqWith } from 'lodash';
import { DetectPartitionedTopicsResult, detectPartitionedTopics } from '../../../NamespacePage/Topics/Topics';

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


export type TreeNode = InstanceTreeNode | TenantTreeNode | NamespaceTreeNode | TopicTreeNode;

type TreeNodeType = TreeNode['type'];

export type TreePath = TreeNode[];

export const treePath = {
  getTenant: (path: TreePath): TenantTreeNode => path.find(node => node.type === "tenant") as TenantTreeNode,
  getNamespace: (path: TreePath): NamespaceTreeNode => path.find(node => node.type === "namespace") as NamespaceTreeNode,
  getTopic: (path: TreePath): TopicTreeNode => path.find(node => node.type === "topic") as TopicTreeNode,

  isTenant: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "tenant",
  isNamespace: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "namespace",
  isTopic: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "topic",

  getType: (path: TreePath): TreeNodeType | undefined => {
    if (treePath.isTenant(path)) return "tenant";
    if (treePath.isNamespace(path)) return "namespace";
    if (treePath.isTopic(path)) return "topic";
  },

  hasPath: (paths: TreePath[], path: TreePath) => paths.some(p => treePath.arePathsEqual(p, path)),
  uniquePaths: (paths: TreePath[]) => uniqWith(paths, treePath.arePathsEqual),
  arePathsEqual: (pathA: TreePath, pathB: TreePath) => isEqual(pathA, pathB),
  areNodesEqual: (nodeA: TreeNode, nodeB: TreeNode) => isEqual(nodeA, nodeB),

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
