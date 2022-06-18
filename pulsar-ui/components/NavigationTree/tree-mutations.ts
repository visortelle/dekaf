import cloneDeep from "lodash/cloneDeep";
import { Tree, TreePath } from "./TreeView";

export function setTenants(props: { tree: Tree; tenants: string[] }): Tree {
  let _tree = cloneDeep(props.tree);
  _tree.subForest = props.tenants.map((tenant) => ({
    rootLabel: { name: tenant, type: "tenant" },
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
    if (tenantNode.rootLabel.name !== props.tenant) {
      return tenantNode;
    }

    return {
      ...tenantNode,
      subForest: props.namespaces.map((namespace) => ({
        rootLabel: { name: namespace, type: "namespace" },
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
  persistentTopics: string[];
  nonPersistentTopics: string[];
}): Tree {
  let _tree = cloneDeep(props.tree);
  _tree.subForest = _tree.subForest.map((tenantNode) => {
    if (tenantNode.rootLabel.name !== props.tenant) {
      return tenantNode;
    }

    return {
      ...tenantNode,
      subForest: tenantNode.subForest.map((namespaceNode) => {
        if (namespaceNode.rootLabel.name !== props.namespace) {
          return namespaceNode;
        }

        const persistentTopics: Tree[] = props.persistentTopics.map(
          (topic) => ({
            rootLabel: { name: topic, type: "persistent-topic" },
            subForest: [],
          })
        );
        const nonPersistentTopics: Tree[] = props.nonPersistentTopics.map(
          (topic) => ({
            rootLabel: { name: topic, type: "non-persistent-topic" },
            subForest: [],
          })
        );

        return {
          ...namespaceNode,
          subForest: [...persistentTopics, ...nonPersistentTopics],
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
