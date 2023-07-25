import {TreeNode, TreeNodeType, TreePath} from "./tree-path-utils";
import {Tree} from "./tree-utils";

export type PlainTreeNode = {
  type: TreeNodeType;
  name: string;
  nodePath: TreePath;
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
    nodePath: props.path
  } : undefined;

  const subForestNodes: PlainTreeNode[] = tree.subForest.map<PlainTreeNode[]>((tree) => {
    const pathPart = props.getPathPart(tree);
    const path = props.path.concat([pathPart]);

    return treeToPlainTree({
      ...props,
      tree,
      path,
      rootLabel: tree.rootLabel
    });
  }).flat();

  return [rootLabelNode].concat(subForestNodes).filter(node => node !== undefined) as PlainTreeNode[];
}

export default treeToPlainTree;
