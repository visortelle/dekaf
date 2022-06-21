import React, { useEffect, useState, useRef } from 'react';
import useSWR, { mutate, useSWRConfig } from 'swr';
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
import { isEqual } from 'lodash';
import { ListItem, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useNavigate } from 'react-router';
import { useTimeout } from '@react-hook/timeout';

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
  const [scrollToPath, setScrollToPath] = useState<{ path: TreePath, cursor: number, state: 'pending' | 'in-progress' | 'finished' }>({ path: [], cursor: 0, state: 'pending' });
  const [isTimedOutScrollToPathTimeout, startScrollToPathTimeout, resetScrollToPathTimeout] = useTimeout(5000);
  const [itemsRendered, setItemsRendered] = useState<ListItem<PlainTreeNode>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [childrenCountCache, setChildrenCountCache] = useState<{ [key: string]: number }>({});
  const [forceReloadKey] = useState<number>(0);
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;
  const adminBatchClient = PulsarAdminBatchClient.useContext().client;
  const navigate = useNavigate();

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => await adminClient.tenants.getTenants()
  );

  if (tenantsError) {
    notifyError(`Unable to fetch tenants. ${tenantsError}`);
  }

  const { data: childrenCount, error: childrenCountError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : swrKeys.pulsar.batch.getTreeNodesChildrenCount._(itemsRenderedDebounced.map(item => item.data!)),
    async () => await adminBatchClient?.getTreeNodesChildrenCount(itemsRenderedDebounced.map(item => item?.data?.path || [])),
  );

  if (childrenCountError) {
    notifyError(`Unable to get children count. ${childrenCountError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each children count update request.
    setChildrenCountCache(childrenCountCache => ({ ...childrenCountCache, ...childrenCount }));
  }, [childrenCount]);

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

  // // XXX - Handle scroll to selected node. It can be quite buggy. Please re-test it carefully.
  useEffect(() => {
    if (scrollToPath.state === 'finished') {
      return;
    }

    if (props.selectedNodePath.length === 0) {
      // Immediately finish scrolling workflow (!?) if no selected node specified.
      setScrollToPath((scrollToPath) => ({ ...scrollToPath, state: 'finished' }));
      return;
    }

    if (scrollToPath.cursor === 0) {
      setScrollToPath((scrollToPath) => ({ ...scrollToPath, path: props.selectedNodePath, cursor: 0, state: 'in-progress' }));
      setExpandedPaths((expandedPaths) => treePath.uniquePaths([...expandedPaths, ...treePath.expandAncestors(props.selectedNodePath)]));
    }
  }, [props.selectedNodePath]);

  // XXX - Handle scroll to selected node. It can be quite buggy. Re-test it carefully.
  useEffect(() => {
    if (scrollToPath.state === 'finished') {
      return;
    }

    if (scrollToPath.state === 'in-progress') {
      const pathToFind = scrollToPath.path.slice(0, scrollToPath.cursor + 1);
      const nodeIndex = plainTree.findIndex(p => treePath.arePathsEqual(p.path, pathToFind));

      const isNotFound = nodeIndex === -1 && scrollToPath.cursor === scrollToPath.path.length - 1;
      if (isNotFound) {
        resetScrollToPathTimeout();
        startScrollToPathTimeout();
      }

      if (nodeIndex !== -1) {
        const nextCursor = scrollToPath.cursor + 1;

        // XXX - fix it somehow if you can.
        setTimeout(() => virtuosoRef.current?.scrollToIndex(nodeIndex));

        if (nextCursor === scrollToPath.path.length) {
          setScrollToPath((scrollToPath) => ({ ...scrollToPath, state: 'finished' }));
          return;
        }

        setScrollToPath((scrollToPath) => ({ ...scrollToPath, cursor: nextCursor }));
      }
    }
  }, [plainTree, scrollToPath]);

  // XXX - Handle scroll to selected node. It can be quite buggy. Re-test it carefully.
  useEffect(() => {
    if (!isTimedOutScrollToPathTimeout) {
      return;
    }

    if (scrollToPath.state === 'finished') {
      resetScrollToPathTimeout();
      return;
    }

    navigate('/');
    setScrollToPath((scrollToPath) => ({ ...scrollToPath, path: [], cursor: 0, state: 'finished' }));
    setExpandedPaths([]);
    virtuosoRef.current?.scrollToIndex(0);
  }, [isTimedOutScrollToPathTimeout]);

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
    setPlainTree(() => treeToPlainTree(treeToPlainTreeProps));
  }, [expandedPaths, filterPath, filterQueryDebounced, tree]);

  const renderTreeItem = (node: PlainTreeNode) => {
    const { path } = node;
    let nodeContent: React.ReactNode = null;
    let nodeIcon = null;

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

    const pathStr = stringify(path);
    let nodeChildrenCount;
    if (node.type === 'instance') {
      nodeChildrenCount = tenants?.length;
    } else {
      nodeChildrenCount = childrenCountCache[pathStr] || undefined;
    }

    return <div key={`tree-node-${pathStr}`} className={s.Node} onClick={handleNodeClick} title={node.path.map(p => p.name).join('/')}>
      <div className={s.NodeContent}>
        <span>&nbsp;</span>
        <div className={s.NodeIcon} style={{ marginLeft: leftIndent }}>{nodeIcon}</div>
        <span className={s.NodeTextContent}>{nodeContent}</span>
      </div>
      {nodeChildrenCount !== undefined && <div className={s.NodeChildrenCount}>{nodeChildrenCount}</div>}
    </div>
  }

  const isTreeInStuckState = scrollToPath.state === 'in-progress' && scrollToPath.path.length !== 0 && filterQueryDebounced.length !== 0;

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
        {!isTreeInStuckState && scrollToPath.state !== 'finished' && (
          <div className={s.Loading}>
            <span>Navigating to the selected resource...</span>
          </div>
        )}
        {isTreeInStuckState && (
          <div className={s.Loading}>
            <span>Tree stuck. Please decide:</span>
            <SmallButton
              text="Scroll to the selected resource"
              onClick={() => setFilterQuery('')}
              type='primary'
            />
            <SmallButton
              text="Apply filter"
              onClick={() => {
                setScrollToPath((scrollToPath) => ({ ...scrollToPath, path: [], cursor: 0, state: 'finished' }));
              }}
              type='primary'
            />
          </div>
        )}
        {!isTreeInStuckState && (
          <div
            ref={scrollParentRef}
            className={s.TreeScrollParent}
            style={{ opacity: scrollToPath.state === 'finished' ? 1 : 0 }}
          >
            <Virtuoso<PlainTreeNode>
              ref={virtuosoRef}
              itemContent={(_, item) => renderTreeItem(item)}
              data={plainTree}
              customScrollParent={scrollParentRef.current || undefined}
              defaultItemHeight={40}
              fixedItemHeight={40}
              components={{
                EmptyPlaceholder: () => <div className={s.NothingToShow}>
                  <span>No items found. <br />Try another filter query.</span>
                </div>
              }}
              overscan={{ main: window.innerHeight / 2, reverse: window.innerHeight / 2 }}
              totalCount={plainTree.length}
              itemsRendered={(items) => {
                const isShouldUpdate = scrollToPath.state === 'finished' && !isEqual(itemsRendered, items)
                if (isShouldUpdate) {
                  setItemsRendered(() => items);
                }
              }}
            />
          </div>
        )}
      </div>

    </div>
  );
}

export default NavigationTree;
