import React, { useEffect, useState, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import s from './NavigationTree.module.css'
import treeToPlainTree, { PlainTreeNode, Tree, TreePath, treePath, TreeToPlainTreeProps } from './TreeView';
import * as Notifications from '../app/contexts/Notifications';
import * as PulsarAdminClient from '../app/contexts/PulsarAdminClient';
import * as PulsarAdminBatchClient from '../app/contexts/PulsarAdminBatchClient/PulsarAdminBatchClient';
import { setTenants, setTenantNamespaces, setNamespaceTopics } from './tree-mutations';
import Input from '../ui/Input/Input';
import SmallButton from '../ui/SmallButton/SmallButton';
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../ui/Icons/Icons';
import { PulsarInstance, PulsarTenant, PulsarNamespace, PulsarTopic } from './nodes';
import { swrKeys } from '../swrKeys';
import { useQueryParam, withDefault, StringParam } from 'use-query-params';
import { useDebounce } from 'use-debounce';
import stringify from 'safe-stable-stringify';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

type NavigationTreeProps = {
  selectedNodePath: TreePath;
}

const filterQuerySep = '/';

const NavigationTree: React.FC<NavigationTreeProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [tree, setTree] = useState<Tree>({ rootLabel: { name: "/", type: 'instance' }, subForest: [] });
  const [plainTree, setPlainTree] = useState<PlainTreeNode[]>([]);
  const [filterQuery, setFilterQuery] = useQueryParam('q', withDefault(StringParam, ''));
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [filterPath, setFilterPath] = useState<TreePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<TreePath[]>([]);
  const [scrollToPath, setScrollToPath] = useState<{ path: TreePath, cursor: number }>({ path: [], cursor: 0 });
  const [isBeenScrolledToSelectedNodePath, setIsBeenScrolledToSelectedNodePath] = useState(false);
  const [forceReloadKey, setForceReloadKey] = useState<number>(0);
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;
  const adminBatchClient = PulsarAdminBatchClient.useContext().client;

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => await adminClient.tenants.getTenants()
  );

  if (tenantsError) {
    notifyError(`Unable to fetch tenants. ${tenantsError}`);
  }

  const { data: tenantsNamespaces, error: tenantsNamespacesError } = useSWR(
    tenants === undefined ? null : swrKeys.pulsar.batch.tenantsNamespaces._(),
    async () => await adminBatchClient?.getTenantsNamespaces(tenants || [])
  );
  if (tenantsNamespacesError) {
    notifyError(`Unable to fetch tenants namespaces. ${tenantsNamespacesError}`);
  }

  useEffect(() => {
    setTree((tree) => setTenants({
      tree,
      tenants: tenants ? tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []
    }));
  }, [tenants]);

  useEffect(() => {
    const fp = filterQueryDebounced.split(filterQuerySep).map((part, i) => {
      switch (i) {
        case 0: return { type: 'tenant', name: part };
        case 1: return { type: 'namespace', name: part };
        case 2: return { type: 'topic', name: part };
      }
    }) as TreePath;

    setFilterPath(() => fp);
  }, [filterQueryDebounced]);

  // XXX - Handle scroll to selected node. It can be quite buggy. Please re-test it carefully.
  useEffect(() => {
    if (!isBeenScrolledToSelectedNodePath) {
      setScrollToPath({ path: props.selectedNodePath, cursor: 0 });
      setExpandedPaths(treePath.uniquePaths([...expandedPaths, ...treePath.expandAncestors(props.selectedNodePath)]));
    }
  }, [props.selectedNodePath])

  // XXX - Handle scroll to selected node. It can be quite buggy. Please re-test it carefully.
  useEffect(() => {
    if (isBeenScrolledToSelectedNodePath) {
      return;
    }

    if (scrollToPath.path.length === 0) {
      return;
    }

    if (scrollToPath.cursor < scrollToPath.path.length) {
      const pathToFind = scrollToPath.path.slice(0, scrollToPath.cursor + 1);
      const nodeIndex = plainTree.findIndex(p => treePath.arePathsEqual(p.path, pathToFind));
      if (nodeIndex !== -1) {
        setTimeout(() => virtuosoRef.current?.scrollToIndex(nodeIndex));

        const nextCursor = scrollToPath.cursor + 1;
        if (nextCursor === scrollToPath.path.length) {
          setScrollToPath({ path: [], cursor: 0 });
          setIsBeenScrolledToSelectedNodePath(true);
          return
        }

        setScrollToPath((scrollToPath) => ({ ...scrollToPath, cursor: nextCursor }));
      }
    }
  }, [plainTree, scrollToPath, isBeenScrolledToSelectedNodePath]);

  useEffect(() => {
    const treeToPlainTreeProps: TreeToPlainTreeProps = {
      tree,
      plainTree: [],
      path: [],
      getPathPart: (node) => ({ type: node.rootLabel.type, name: node.rootLabel.name }),
      rootLabel: { name: 'Pulsar Instance', type: 'instance' },
      alterTree: (tree) => tree,
      getVisibility: (tree, path) => ({
        tree: true,
        rootLabel: (() => {
          if (tree.rootLabel.type === 'instance') {
            return filterQueryDebounced.length === 0;
          }

          if (filterQueryDebounced.length !== 0) {
            if (filterQueryDebounced.includes(filterQuerySep)) {
              const a = path.every((part, i) => {
                return i === filterPath.length - 1 ? part.name.includes(filterPath[filterPath.length - 1].name) : part.name === filterPath[i]?.name;
              });

              const b = path.length === filterPath.length && filterPath[filterPath.length - 1]?.name === '' && filterPath[filterPath.length - 2]?.name === path[path.length - 2]?.name;
              return a || b;
            }

            return tree.rootLabel.name.includes(filterQueryDebounced)
          }

          return path.length === 1 ? true : treePath.hasPath(expandedPaths, path.slice(0, path.length - 1));
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
      }),
    }
    setPlainTree(treeToPlainTree(treeToPlainTreeProps));
  }, [expandedPaths, filterPath, filterQueryDebounced, tree, tenantsNamespaces]);

  const renderTreeItem = (node: PlainTreeNode) => {
    const { path } = node;
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
          isFetchData={isExpanded || treePath.getTenant(filterPath)?.name === node.name}
        />
      );
      childrenCount = tenantsNamespaces === undefined ? null : tenantsNamespaces[tenant.name]?.length;
      nodeIcon = <TenantIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;

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
          isFetchData={isExpanded || treePath.getNamespace(filterPath)?.name === node.name}
        />
      );
      nodeIcon = <NamespaceIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
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
          isFetchData={isExpanded || treePath.getTopic(filterPath)?.name === node.name}
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

    const handleNodeClick = async () => {
      switch (node.type) {
        case 'instance': await mutate(swrKeys.pulsar.tenants._()); break;
        case 'tenant': await mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: treePath.getTenant(path)!.name })); break;
        case 'namespace': await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.topics._({ tenant: treePath.getTenant(path)!.name, namespace: treePath.getNamespace(path)!.name })); break;
      }
    }

    return <div key={stringify(node)} className={s.Node} onClick={handleNodeClick}>
      <div className={s.NodeContent}>
        <span>&nbsp;</span>
        <div className={s.NodeIcon} style={{ marginLeft: leftIndent }}>{nodeIcon}</div>
        <span className={s.NodeTextContent}>{nodeContent}</span>
      </div>
      {childrenCount !== null && <div className={s.NodeChildrenCount}>{childrenCount}</div>}
    </div>
  }

  const isLoading = scrollToPath.path.length !== 0 && scrollToPath.cursor <= scrollToPath.path.length;

  return (
    <div className={s.NavigationTree}>
      <div className={s.FilterQueryInput}>
        <Input
          placeholder="tenant/namespace/topic"
          value={filterQuery}
          onChange={v => setFilterQuery(v)}
          clearable={true}
          focusOnMount={true}
        />
      </div>
      <div className={s.TreeControlButtons}>
        <div>
          <SmallButton text='Collapse all' onClick={() => setExpandedPaths([])} type='primary' />
        </div>
      </div>

      <div className={s.TreeContainer}>
        {isLoading && <div className={s.Loading}>Loading ...</div>}
        <div
          ref={scrollParentRef}
          className={s.TreeScrollParent}
          style={{ opacity: isLoading ? 0 : 1 }}
        >
          <Virtuoso<PlainTreeNode>
            ref={virtuosoRef}
            itemContent={(_, item) => renderTreeItem(item)}
            data={plainTree}
            customScrollParent={scrollParentRef.current || undefined}
            defaultItemHeight={40}
            fixedItemHeight={40}
            overscan={{ main: window.innerHeight, reverse: window.innerHeight }}
          />
        </div>
      </div>

    </div>
  );
}

export default NavigationTree;
