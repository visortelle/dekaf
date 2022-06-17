import { isEqual, uniqWith } from 'lodash';
import React from 'react';

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

export type TreeProps<NC> = {
  tree: Tree,
  path: TreePath,
  renderNode: RenderNode<NC>,
  getPathPart: (tree: Tree) => TreeNode,
  nodeCommons: NC
}

export type RenderNode<NC> = (node: TreeNode, path: TreePath, ctx: NC) => ({
  getVisibility: (tree: Tree, path: TreePath) => {
    tree: boolean,
    rootLabel: boolean,
    subForest: boolean
  },
  alterTree: (tree: Tree, path: TreePath) => Tree,
  rootLabel: React.ReactNode,
  cssClasses: {
    node: string,
    rootLabel: string,
    subForest: string
  },
  styles: {
    node: React.CSSProperties,
    rootLabel: React.CSSProperties,
    subForest: React.CSSProperties
  }
});

function TreeView<NC>(props: TreeProps<NC>) {
  const { alterTree, getVisibility, rootLabel, cssClasses, styles } = props.renderNode(props.tree.rootLabel, props.path, props.nodeCommons);
  const tree = alterTree(props.tree, props.path);
  const visibility = getVisibility(tree, props.path);

  return !visibility.tree ? null : (
    <div className={cssClasses.node} style={styles.node}>
      <div className={cssClasses.rootLabel} style={{ ...styles.rootLabel, ...(visibility.rootLabel ? {} : { display: 'none' }) }}>
        {rootLabel}
      </div>
      {tree.subForest.length > 0 && (
        <div className={cssClasses.subForest} style={{ ...styles.subForest, ...(visibility.subForest ? {} : { display: 'none' }) }}>
          {tree.subForest.map(tree => {
            const pathPart = props.getPathPart(tree);
            const path = props.path.concat([pathPart]);
            return (
              <TreeView
                key={`${tree.rootLabel.type}-${tree.rootLabel.name}`}
                {...props}
                tree={tree}
                path={path}
              />
            )
          })}
        </div>
      )}
    </div>
  );
}

export default TreeView;
