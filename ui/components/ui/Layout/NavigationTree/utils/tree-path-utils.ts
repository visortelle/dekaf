import { isEqual, uniqWith } from 'lodash';

export type TreeNodeType = "instance" | "tenant" | "namespace" | "persistent-topic" | "non-persistent-topic"

export type TreeNode = { type: TreeNodeType, name: string };

export type TreePath = TreeNode[];

const TreePathUtils = {
  getTenant: (path: TreePath) => path.find(node => node.type === "tenant"),
  getNamespace: (path: TreePath) => path.find(node => node.type === "namespace"),
  getTopic: (path: TreePath) => path.find(node => node.type === "persistent-topic" || node.type === "non-persistent-topic"),

  isTenant: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "tenant",
  isNamespace: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "namespace",
  isPersistentTopic: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "persistent-topic",
  isNonPersistentTopic: (path: TreePath) => path.length > 0 && path[path.length - 1].type === "non-persistent-topic",

  getType: (path: TreePath): TreeNodeType | undefined => {
    if (TreePathUtils.isTenant(path)) return "tenant";
    if (TreePathUtils.isNamespace(path)) return "namespace";
    if (TreePathUtils.isPersistentTopic(path)) return "persistent-topic";
    if (TreePathUtils.isNonPersistentTopic(path)) return "non-persistent-topic";
  },

  hasPath: (paths: TreePath[], path: TreePath) => paths.some(p => TreePathUtils.arePathsEqual(p, path)),
  uniquePaths: (paths: TreePath[]) => uniqWith(paths, TreePathUtils.arePathsEqual),
  arePathsEqual: (pathA: TreePath, pathB: TreePath) => isEqual(pathA, pathB),
  areNodesEqual: (nodeA: TreeNode, nodeB: TreeNode) => isEqual(nodeA, nodeB),

  isPathExpanded: (paths: TreePath[], path: TreePath) => paths.some((p) => TreePathUtils.arePathsEqual(path, p)),
  expandAncestors: (path: TreePath): TreePath[] => {
    // Thank you, Copilot :)
    const ancestors = [];
    for (let i = 0; i < path.length - 1; i++) {
      ancestors.push(path.slice(0, i + 1));
    }
    return ancestors;
  }
}

export default TreePathUtils;
