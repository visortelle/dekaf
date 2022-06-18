import React, { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import s from './NavigationTree.module.css'
import TreeView, { Tree, TreePath, treePath } from './TreeView';
import * as Notifications from '../app/contexts/Notifications';
import * as PulsarAdminClient from '../app/contexts/PulsarAdminClient';
import { setTenants, setTenantNamespaces, setNamespaceTopics, expandAll } from './tree-mutations';
import Input from '../ui/Input/Input';
import SmallButton from '../ui/SmallButton/SmallButton';
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../ui/Icons/Icons';
import { PulsarInstance, PulsarTenant, PulsarNamespace, PulsarTopic } from './nodes';
import { swrKeys } from '../swrKeys';
import { useQueryParam, withDefault, StringParam } from 'use-query-params';

type NodeTypeFilter = {
  showTenants: boolean;
  showNamespaces: boolean;
  showPersistentTopics: boolean;
  showNonPersistentTopics: boolean
};
const defaultNodeTypeFilter: NodeTypeFilter = {
  showTenants: true,
  showNamespaces: true,
  showPersistentTopics: true,
  showNonPersistentTopics: true
}

type NavigationTreeProps = {
  selectedNodePath: TreePath;
}

const filterQuerySep = '/';

const NavigationTree: React.FC<NavigationTreeProps> = (props) => {
  const [tree, setTree] = useState<Tree>({ rootLabel: { name: "/", type: 'instance' }, subForest: [] });
  const [filterQuery, setFilterQuery] = useQueryParam('q', withDefault(StringParam, ''));
  const [filterPath, setFilterPath] = useState<TreePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<TreePath[]>([]);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<NodeTypeFilter>(defaultNodeTypeFilter);
  const [forceReloadKey, setForceReloadKey] = useState<number>(0);

  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => await adminClient.tenants.getTenants()
  );

  if (tenantsError) {
    notifyError(`Unable to fetch tenants. ${tenantsError.toString()}`);
  }

  useEffect(() => {
    setTree((tree) => setTenants({ tree, tenants: tenants || [] }));
  }, [tenants]);

  useEffect(() => {
    const fp = filterQuery.split(filterQuerySep).map((part, i) => {
      switch (i) {
        case 0: return { type: 'tenant', name: part };
        case 1: return { type: 'namespace', name: part };
        case 2: return { type: 'topic', name: part };
      }
    }) as TreePath;

    setFilterPath(() => fp);
  }, [filterQuery]);

  useEffect(() => {
    setExpandedPaths((expandedPaths) => treePath.uniquePaths([...expandedPaths, ...treePath.expandAncestors(props.selectedNodePath)]));
  }, [props.selectedNodePath])

  useEffect(() => {
    setForceReloadKey((key) => key + 1);
  }, [nodeTypeFilter]);

  return (
    <div className={s.NavigationTree}>
      <div className={s.FilterQueryInput}>
        <Input placeholder="public/functions/metadata" value={filterQuery} onChange={v => setFilterQuery(v)} clearable={true} focusOnMount={true} />
      </div>
      <div className={s.TreeControlButtons}>
        <SmallButton text='Expand' onClick={() => setExpandedPaths(expandAll(tree, [], []))} />
        <SmallButton text='Collapse' onClick={() => setExpandedPaths([])} />
        <TenantIcon
          isExpanded={false}
          isExpandable={true}
          onClick={() => setNodeTypeFilter((nodeTypeFilter) => ({ ...nodeTypeFilter, showTenants: !nodeTypeFilter.showTenants }))}
          className={s.NodeTypeFilterButton}
          isGray={!nodeTypeFilter.showTenants}
        />
        <NamespaceIcon
          isExpanded={false}
          isExpandable={true}
          onClick={() => setNodeTypeFilter((nodeTypeFilter) => ({ ...nodeTypeFilter, showNamespaces: !nodeTypeFilter.showNamespaces }))}
          className={s.NodeTypeFilterButton}
          isGray={!nodeTypeFilter.showNamespaces}
        />
        <TopicIcon
          isExpanded={false}
          isExpandable={true}
          onClick={() => setNodeTypeFilter((nodeTypeFilter) => ({ ...nodeTypeFilter, showPersistentTopics: !nodeTypeFilter.showPersistentTopics }))}
          className={s.NodeTypeFilterButton}
          isGray={!nodeTypeFilter.showPersistentTopics}
          topicType="persistent"
        />
        <TopicIcon
          isExpanded={false}
          isExpandable={true}
          onClick={() => setNodeTypeFilter((nodeTypeFilter) => ({ ...nodeTypeFilter, showNonPersistentTopics: !nodeTypeFilter.showNonPersistentTopics }))}
          className={s.NodeTypeFilterButton}
          isGray={!nodeTypeFilter.showNonPersistentTopics}
          topicType="non-persistent"
        />
      </div>
      <TreeView
        nodeCommons={{}}
        getPathPart={(node) => ({ type: node.rootLabel.type, name: node.rootLabel.name })}
        path={[]}
        renderNode={(node, path) => {
          return ({
            alterTree: (tree) => tree,
            cssClasses: {
              node: '',
              rootLabel: '',
              subForest: ''
            },
            getVisibility: (tree, path) => ({
              rootLabel: (() => {
                if (filterQuery.length !== 0) {
                  if (tree.rootLabel.type === 'instance') {
                    return false;
                  }

                  if (filterQuery.includes(filterQuerySep)) {
                    const a = path.every((part, i) => {
                      return i === filterPath.length - 1 ? part.name.includes(filterPath[filterPath.length - 1].name) : part.name === filterPath[i]?.name;
                    });

                    const b = path.length === filterPath.length && filterPath[filterPath.length - 1]?.name === '' && filterPath[filterPath.length - 2]?.name === path[path.length - 2]?.name;
                    return a || b;
                  }

                  return tree.rootLabel.name.includes(filterQuery)
                }

                if (tree.rootLabel.type === 'tenant' && !nodeTypeFilter.showTenants) {
                  return false;
                }

                if (tree.rootLabel.type === 'namespace' && !nodeTypeFilter.showNamespaces) {
                  return false;
                }

                if (tree.rootLabel.type === 'persistent-topic' && !nodeTypeFilter.showPersistentTopics) {
                  return false;
                }

                if (tree.rootLabel.type === 'non-persistent-topic' && !nodeTypeFilter.showNonPersistentTopics) {
                  return false;
                }

                return true;
              })(),
              subForest: (() => {
                if (path.length === 0) {
                  return true;
                }

                if (filterPath.length > 0 && filterPath[path.length - 1]?.name === path[path.length - 1].name) {
                  return true;
                }

                return treePath.isPathExpanded(expandedPaths, path);
              })(),
              tree: true
            }),
            rootLabel: (() => {
              let nodeContent: React.ReactNode = null;
              let nodeIcon = null;
              let childrenCount = null;
              const leftIndent = node.type === 'instance' ? '5ch' : `${((path.length + 1) * 3 - 1)}ch`;

              const toggleNodeExpanded = () => setExpandedPaths(
                (expandedPaths) => treePath.hasPath(expandedPaths, path) ?
                  expandedPaths.filter(p => !treePath.arePathsEqual(p, path)) :
                  expandedPaths.concat([path])
              );
              const isExpanded = treePath.isPathExpanded(expandedPaths, path);

              if (node.type === 'instance') {
                const isActive = props.selectedNodePath.length === 0;
                nodeContent = (
                  <PulsarInstance
                    forceReloadKey={forceReloadKey}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                    isActive={isActive}
                  />
                );
                nodeIcon = <InstanceIcon onClick={toggleNodeExpanded} isExpandable={false} isExpanded={isExpanded} />;
                childrenCount = tenants?.length;

              } else if (node.type === 'tenant') {
                const tenant = treePath.getTenant(path)!;

                const isActive = treePath.areNodesEqual(treePath.getTenant(props.selectedNodePath)!, tenant) && treePath.getNamespace(props.selectedNodePath) === undefined;

                nodeContent = (
                  <PulsarTenant
                    forceReloadKey={forceReloadKey}
                    tenant={node.name}
                    onNamespaces={(namespaces) => setTree((tree) => setTenantNamespaces({ tree, tenant: tenant.name, namespaces }))}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                    isActive={isActive}
                  />
                );
                nodeIcon = <TenantIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
                childrenCount = tree.subForest.find((ch) => ch.rootLabel.name === tenant.name)?.subForest.length;

              } else if (node.type === 'namespace') {
                const tenant = treePath.getTenant(path)!;
                const namespace = treePath.getNamespace(path)!;

                const isActive = treePath.areNodesEqual(treePath.getTenant(props.selectedNodePath)!, tenant) &&
                  treePath.areNodesEqual(treePath.getNamespace(props.selectedNodePath)!, namespace) && treePath.getTopic(props.selectedNodePath) === undefined;

                nodeContent = (
                  <PulsarNamespace
                    forceReloadKey={forceReloadKey}
                    tenant={tenant.name}
                    namespace={namespace.name}
                    onTopics={(topics) => setTree((tree) => setNamespaceTopics({ tree, tenant: tenant.name, namespace: namespace.name, persistentTopics: topics.persistent, nonPersistentTopics: topics.nonPersistent }))}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                    isActive={isActive}
                  />
                );
                nodeIcon = <NamespaceIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
                childrenCount = tree.subForest.find((ch) => ch.rootLabel.name === tenant.name)?.subForest.find((ch) => ch.rootLabel.name === namespace.name)?.subForest.length;
              } else if (node.type === 'persistent-topic' || node.type === 'non-persistent-topic') {
                const tenant = treePath.getTenant(path)!;
                const namespace = treePath.getNamespace(path)!;

                const topicName = node.name;
                const topicType = node.type === 'persistent-topic' ? 'persistent' : 'non-persistent';

                const isActive = treePath.areNodesEqual(treePath.getTenant(props.selectedNodePath)!, tenant) &&
                  treePath.areNodesEqual(treePath.getNamespace(props.selectedNodePath)!, namespace) &&
                  treePath.areNodesEqual(
                    treePath.getTopic(props.selectedNodePath)!, { name: topicName, type: topicType === 'persistent' ? 'persistent-topic' : 'non-persistent-topic' }
                  );

                nodeContent = (
                  <PulsarTopic
                    tenant={tenant.name}
                    namespace={namespace.name}
                    topic={topicName}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                    topicType={topicType}
                    isActive={isActive}
                  />
                );
                nodeIcon = (
                  <TopicIcon
                    isExpandable={false}
                    isExpanded={false}
                    onClick={() => undefined}
                    topicType={topicType}
                  />
                )
              }

              const handleNodeClick = () => {
                switch (node.type) {
                  case 'instance': () => mutate(swrKeys.pulsar.tenants._()); break;
                  case 'tenant': mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: treePath.getTenant(path)!.name })); break;
                  case 'namespace': mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.topics._({ tenant: treePath.getTenant(path)!.name, namespace: treePath.getNamespace(path)!.name })); break;
                }
              }

              return <div className={s.Node} onClick={handleNodeClick}>
                <div className={s.NodeContent}>
                  <span>&nbsp;</span>
                  <div className={s.NodeIcon} style={{ marginLeft: leftIndent }}>{nodeIcon}</div>
                  <span className={s.NodeTextContent}>{nodeContent}</span>
                </div>
                {childrenCount !== null && <div className={s.NodeChildrenCount}>{childrenCount}</div>}
              </div>
            })(),
            styles: {
              node: {},
              rootLabel: {},
              subForest: {}
            }
          })
        }}
        tree={tree}
      />
    </div>
  );
}

export default NavigationTree;
