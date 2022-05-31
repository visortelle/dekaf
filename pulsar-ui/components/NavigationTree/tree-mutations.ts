import cloneDeep from "lodash/cloneDeep";
import { Tree } from "./TreeView";

export function setTenants(tree: Tree, tenants: string[]): Tree {
  let _tree = cloneDeep(tree);
  _tree.subForest = tenants.map((tenant) => ({
    rootLabel: { name: tenant, type: "tenant" },
    subForest: [],
  }));
  return _tree;
}

export function setTenantNamespaces(
  tree: Tree,
  tenant: string,
  namespaces: string[]
): Tree {
  let _tree = cloneDeep(tree);
  _tree.subForest = _tree.subForest.map((tenantNode) => {
    if (tenantNode.rootLabel.name !== tenant) {
      return tenantNode;
    }

    return {
      ...tenantNode,
      subForest: namespaces.map((namespace) => ({
        rootLabel: { name: namespace, type: "namespace" },
        subForest: [],
      })),
    };
  });
  return _tree;
}

export function setNamespaceTopics(
  tree: Tree,
  tenant: string,
  namespace: string,
  topics: string[]
): Tree {
  let _tree = cloneDeep(tree);
  _tree.subForest = _tree.subForest.map((tenantNode) => {
    if (tenantNode.rootLabel.name !== tenant) {
      return tenantNode;
    }

    return {
      ...tenantNode,
      subForest: tenantNode.subForest.map((namespaceNode) => {
        if (namespaceNode.rootLabel.name !== namespace) {
          return namespaceNode;
        }

        return {
          ...namespaceNode,
          subForest: topics.map((topic) => ({
            rootLabel: { name: topic, type: "topic" },
            subForest: [],
          })),
        };
      }),
    };
  });
  return _tree;
}

type ExpandedPaths = string[];
export function expandAll(
  tree: Tree,
  treePath: string[],
  expandedPaths: ExpandedPaths
): ExpandedPaths {
  return [
    ...expandedPaths,
    JSON.stringify(treePath),
    ...tree.subForest
      .map((subTree) =>
        expandAll(
          subTree,
          treePath.concat([subTree.rootLabel.name]),
          expandedPaths
        )
      )
      .flat(),
  ];
}
