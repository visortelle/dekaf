import { isEqual, uniqWith } from 'lodash';

export type Tree = {
  subForest: Tree[];
  rootLabel: TreeNode;
}

export type TreeNodeType = "instance" | "tenant" | "namespace" | "persistent-topic" | "non-persistent-topic"

export type TreeNode = { type: TreeNodeType, name: string };

export type TreePath = TreeNode[];

export const treePath = {
  getTenant: (path: TreePath) => path.find(node => node.type === "tenant"),
  getNamespace: (path: TreePath) => path.find(node => node.type === "namespace"),
  getTopic: (path: TreePath) => path.find(node => node.type === "persistent-topic" || node.type === "non-persistent-topic"),

  isTenant: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "tenant",
  isNamespace: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "namespace",
  isPersistentTopic: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "persistent-topic",
  isNonPersistentTopic: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "non-persistent-topic",

  getType: (path: TreePath): TreeNodeType | undefined => {
    if (treePath.isTenant(path)) return "tenant";
    if (treePath.isNamespace(path)) return "namespace";
    if (treePath.isPersistentTopic(path)) return "persistent-topic";
    if (treePath.isNonPersistentTopic(path)) return "non-persistent-topic";
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

export type PlainTreeNode = {
  type: TreeNodeType;
  name: string;
  path: TreePath;
}

export type TreeToPlainTreeProps = {
  tree: Tree;
  path: TreePath;
  getPathPart: (tree: Tree) => TreeNode;
  plainTree: PlainTreeNode[];
  rootLabel: TreeNode;
  getVisibility: (tree: Tree, path: TreePath) => {
    tree: boolean,
    rootLabel: boolean,
    subForest: boolean
  },
  alterTree: (tree: Tree, path: TreePath) => Tree,
}
function treeToPlainTree(props: TreeToPlainTreeProps): PlainTreeNode[] {
  const { alterTree, getVisibility } = props;
  const tree = alterTree(props.tree, props.path);
  const visibility = getVisibility(tree, props.path);

  if (!visibility.tree) {
    return props.plainTree;
  }

  const rootLabelNode: PlainTreeNode | undefined = visibility.rootLabel ? {
    type: props.rootLabel.type,
    name: props.rootLabel.name,
    path: props.path
  } : undefined;

  const subForestNodes: PlainTreeNode[] = tree.subForest.map<PlainTreeNode[]>((tree) => {
    const pathPart = props.getPathPart(tree);
    const path = props.path.concat([pathPart]);

    const t = treeToPlainTree({
      ...props,
      tree,
      path,
      rootLabel: tree.rootLabel
    });

    return t;
  }).flat();

  return [rootLabelNode].concat(subForestNodes).filter(node => node !== undefined) as PlainTreeNode[];
}

export default treeToPlainTree;
