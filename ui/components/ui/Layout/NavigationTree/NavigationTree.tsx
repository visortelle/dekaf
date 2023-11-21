import React, { useEffect, useState, useRef, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import s from './NavigationTree.module.css'
import treeToFlattenTree, { getRootLabelName, FlattenTreeNode, TopicTreeNode, Tree, TreePath, treePath, TreeToFlattenTreeProps, TreeNode } from './TreeView';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as tenantPb from '../../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { setTenants, setTenantNamespaces, setNamespaceTopics } from './tree-mutations';
import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../../Icons/Icons';
import { PulsarInstance, PulsarTenant, PulsarNamespace, PulsarTopic, PulsarTopicPartition } from './nodes';
import { swrKeys } from '../../../swrKeys';
import { useQueryParam, withDefault, StringParam } from 'use-query-params';
import { useDebounce } from 'use-debounce';
import stringify from 'safe-stable-stringify';
import { isEqual } from 'lodash';
import { ListItem, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useNavigate } from 'react-router';
import { useTimeout } from '@react-hook/timeout';
import { remToPx } from '../../rem-to-px';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import CredentialsButton from '../../../app/pulsar-auth/Button/Button';
import collapseAllIcon from './collapse-all.svg';
import focusIcon from './focus.svg';
import { usePrevious } from '../../../app/hooks/use-previous';
import { boolean } from 'fp-ts';

type NavigationTreeProps = {
  selectedNodePath: TreePath;
}

const filterQuerySep = '/';

const NavigationTree: React.FC<NavigationTreeProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [tree, setTree] = useState<Tree>({ rootLabel: { name: "/", type: 'instance' }, subForest: [] });
  const [flattenTree, setFlattenTree] = useState<FlattenTreeNode[]>([]);
  const [filterQuery, setFilterQuery] = useQueryParam('q', withDefault(StringParam, ''));
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [filterPath, setFilterPath] = useState<TreePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<TreePath[]>([]);
  const [scrollToPath, setScrollToPath] = useState<{ path: TreePath, cursor: number, state: 'pending' | 'in-progress' | 'finished', isBeenFinishedOnce: boolean }>({ path: [], cursor: 0, state: 'pending', isBeenFinishedOnce: false });
  const [isTimedOutScrollToPathTimeout, startScrollToPathTimeout, resetScrollToPathTimeout] = useTimeout(15_000);
  const [itemsRendered, setItemsRendered] = useState<ListItem<FlattenTreeNode>[]>([]);
  const [forceReloadKey] = useState<number>(0);
  const { notifyError } = Notifications.useContext();
  const { tenantServiceClient } = GrpcClient.useContext();
  const previousSelectedNodePath = usePrevious(props.selectedNodePath);
  const navigate = useNavigate();

  const { data: tenantsData, error: tenantsDataError } = useSWR(
    swrKeys.pulsar.tenants.listTenants._(),
    async () => {
      const req = new tenantPb.ListTenantsResponse();
      const res = await tenantServiceClient.listTenants(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get tenants: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res;
    }
  );

  if (tenantsDataError) {
    notifyError(`Unable to fetch tenants. ${tenantsDataError}`);
  }

  const tenants = useMemo(() => tenantsData === undefined ? [] : tenantsData.getTenantsList(), [tenantsData]);

  useEffect(() => {
    setTree((tree) => setTenants({
      tree,
      tenants: tenants ? tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []
    }));
  }, [tenants]);

  useEffect(() => {
    const parts = filterQueryDebounced.split(filterQuerySep);

    const tenant = parts[0];
    const namespace = parts[1];
    const topic = parts[2];

    let fp: TreePath = [];
    switch (parts.length) {
      case 1: {
        fp = [{ type: "tenant", tenant }]
      }; break;
      case 2: {
        fp = [{ type: "tenant", tenant }, { type: "namespace", tenant, namespace }]
      }; break;
      case 3: {
        fp = [
          { type: "tenant", tenant },
          { type: "namespace", tenant, namespace },
          {
            type: "topic",
            tenant,
            namespace,
            topic,
            persistency: "persistent", // doesn't matter here
            partitioning: { type: 'non-partitioned' }, // doesn't matter here
            topicFqn: "" // doesn't matter here
          }
        ]
      }; break;
    }

    setFilterPath(() => fp);
  }, [filterQueryDebounced]);

  const navigateToPath = (path: TreePath) => {
    setScrollToPath((scrollToPath) => ({ ...scrollToPath, path, cursor: 0, state: 'in-progress' }));
    setExpandedPaths((expandedPaths) => treePath.uniquePaths([...expandedPaths, ...treePath.expandAncestors(path)]));
  }

  // // XXX - Handle scroll to selected node. It can be quite buggy. Please re-test it carefully.
  useEffect(() => {
    if (scrollToPath.state === 'finished') {
      return;
    }

    if (props.selectedNodePath.length === 0) {
      // Immediately finish scrolling workflow (!?) if no selected node specified.
      setScrollToPath((scrollToPath) => ({ ...scrollToPath, state: 'finished', isBeenFinishedOnce: true }));
      return;
    }

    if (scrollToPath.cursor === 0) {
      navigateToPath(props.selectedNodePath);
    }
  }, [props.selectedNodePath]);

  // XXX - Handle scroll to selected node. It can be quite buggy. Re-test it carefully.
  useEffect(() => {
    if (scrollToPath.state === 'finished') {
      return;
    }

    if (scrollToPath.state === 'in-progress') {
      const pathToFind = scrollToPath.path.slice(0, scrollToPath.cursor + 1);
      const nodeIndex = flattenTree.findIndex(p => treePath.arePathsEqual(p.path, pathToFind));

      const isNotFound = nodeIndex === -1 && scrollToPath.cursor === scrollToPath.path.length - 1;
      if (isNotFound) {
        resetScrollToPathTimeout();
        startScrollToPathTimeout();
      }

      if (nodeIndex !== -1) {
        const nextCursor = scrollToPath.cursor + 1;

        // XXX - get rid of setTimeout somehow if you can.
        setTimeout(() => virtuosoRef.current?.scrollToIndex(nodeIndex));

        if (nextCursor === scrollToPath.path.length) {
          setScrollToPath((scrollToPath) => ({ ...scrollToPath, state: 'finished', isBeenFinishedOnce: true }));
          return;
        }

        setScrollToPath((scrollToPath) => ({ ...scrollToPath, cursor: nextCursor }));
      }
    }
  }, [flattenTree, scrollToPath]);

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
    setScrollToPath((scrollToPath) => ({ ...scrollToPath, path: [], cursor: 0, state: 'finished', isBeenFinishedOnce: true }));
    setExpandedPaths([]);
    virtuosoRef.current?.scrollToIndex(0);
  }, [isTimedOutScrollToPathTimeout]);

  useEffect(() => {
    const treeToFlattenTreeProps: TreeToFlattenTreeProps = {
      tree,
      plainTree: [],
      path: [],
      getPathPart: (node) => node.rootLabel,
      rootLabel: { name: 'Pulsar', type: 'instance' },
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
                const name = getRootLabelName(part);
                return i === filterPath.length - 1 ?
                  name.includes(getRootLabelName(filterPath[filterPath.length - 1])) :
                  name === getRootLabelName(filterPath[i]);
              });

              const b = path.length === filterPath.length && getRootLabelName(filterPath[filterPath.length - 1]) === '' && getRootLabelName(filterPath[filterPath.length - 2]) === getRootLabelName(path[path.length - 2]);
              return a || b;
            }

            return getRootLabelName(tree.rootLabel).includes(filterQueryDebounced)
          }

          if (tree.rootLabel.type === "topic-partition") {
            return expandedPaths.filter(p => treePath.isTopic(p)).some(p => {
              const topic = treePath.getTopic(p)!;
              return (tree.rootLabel as TopicTreeNode).topicFqn.startsWith(topic.topicFqn);
            });
          }

          return path.length === 1 ? true : treePath.hasPath(expandedPaths, path.slice(0, path.length - 1));
        })(),
        subForest: (() => {
          if (path.length === 0) {
            return true;
          }

          const a = filterPath[path.length - 1];
          const b = path[path.length - 1];
          if (filterPath.length > 0 && a !== undefined && getRootLabelName(a) === getRootLabelName(b)) {
            return true;
          }

          return treePath.isPathExpanded(expandedPaths, path);
        })(),
      }),
    }
    setFlattenTree(() => treeToFlattenTree(treeToFlattenTreeProps));
  }, [expandedPaths, filterPath, filterQueryDebounced, tree]);

  const renderTreeItem = (node: FlattenTreeNode) => {
    const { path } = node;
    let nodeContent: React.ReactNode = null;
    let nodeIcon = null;

    let leftIndent = '0';
    if (node.type === 'instance') {
      leftIndent = '5ch'
    } else {
      leftIndent = `${((path.length + 1) * 3 - 1)}ch`;
    }

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
      const tenantNode = treePath.getTenant(path)!;
      const selectedTenantNode = props.selectedNodePath === undefined ? undefined : treePath.getTenant(props.selectedNodePath);

      const isActive =
        selectedTenantNode !== undefined &&
        treePath.areNodesEqual(selectedTenantNode, tenantNode) &&
        treePath.getNamespace(props.selectedNodePath) === undefined;

      nodeContent = (
        <PulsarTenant
          forceReloadKey={forceReloadKey}
          tenant={node.name}
          onNamespaces={(namespaces) => setTree((tree) => setTenantNamespaces({ tree, tenant: tenantNode.tenant, namespaces }))}
          leftIndent={leftIndent}
          onDoubleClick={toggleNodeExpanded}
          isActive={isActive}
          isFetchData={isExpanded || treePath.getTenant(filterPath)?.tenant === node.name}
        />
      );
      nodeIcon = <TenantIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;

    } else if (node.type === 'namespace') {
      const tenant = treePath.getTenant(path)!;
      const namespace = treePath.getNamespace(path)!;
      const selectedTenantNode = props.selectedNodePath === undefined ? undefined : treePath.getTenant(props.selectedNodePath);
      const selectedNamespaceNode = props.selectedNodePath === undefined ? undefined : treePath.getNamespace(props.selectedNodePath);

      const isActive =
        selectedTenantNode !== undefined &&
        selectedNamespaceNode !== undefined &&
        treePath.areNodesEqual(selectedTenantNode, tenant) &&
        treePath.areNodesEqual(selectedNamespaceNode, namespace) &&
        treePath.getTopic(props.selectedNodePath) === undefined;

      nodeContent = (
        <PulsarNamespace
          forceReloadKey={forceReloadKey}
          tenant={tenant.tenant}
          namespace={namespace.namespace}
          onTopics={(topics) => setTree((tree) => {
            return setNamespaceTopics({ tree, tenant: tenant.tenant, namespace: namespace.namespace, persistentTopics: topics.persistent, nonPersistentTopics: topics.nonPersistent })
          })}
          leftIndent={leftIndent}
          onDoubleClick={toggleNodeExpanded}
          isActive={isActive}
          isFetchData={isExpanded || treePath.getNamespace(filterPath)?.namespace === node.name}
        />
      );
      nodeIcon = <NamespaceIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
    } else if (node.type === 'topic') {
      const tenant = treePath.getTenant(path)!;
      const namespace = treePath.getNamespace(path)!;
      const topic = treePath.getTopic(path)!;
      const selectedTenantNode = props.selectedNodePath === undefined ? undefined : treePath.getTenant(props.selectedNodePath);
      const selectedNamespaceNode = props.selectedNodePath === undefined ? undefined : treePath.getNamespace(props.selectedNodePath);
      const selectedTopicNode = props.selectedNodePath === undefined ? undefined : treePath.getTopic(props.selectedNodePath);

      const isActive =
        selectedTenantNode !== undefined &&
        selectedNamespaceNode !== undefined &&
        selectedTopicNode !== undefined &&
        treePath.areNodesEqual(selectedTenantNode, tenant) &&
        treePath.areNodesEqual(selectedNamespaceNode, namespace) &&
        treePath.areNodesEqual(selectedTopicNode, topic) &&
        treePath.getTopicPartition(props.selectedNodePath) === undefined;

      nodeContent = (
        <PulsarTopic
          treeNode={topic}
          leftIndent={leftIndent}
          onDoubleClick={toggleNodeExpanded}
          isActive={isActive}
        />
      );

      const isPartitioned = topic.partitioning.type === 'partitioned';
      nodeIcon = (
        <TopicIcon
          isExpandable={isPartitioned}
          isExpanded={isExpanded}
          isPartitioned={isPartitioned}
          onClick={isPartitioned ? toggleNodeExpanded : undefined}
          topicPersistency={topic.persistency}
        />
      )
    } else if (node.type === 'topic-partition') {
      const tenant = treePath.getTenant(path)!;
      const namespace = treePath.getNamespace(path)!;
      const topic = treePath.getTopic(path)!;
      const topicPartition = treePath.getTopicPartition(path)!;
      const selectedTenantNode = props.selectedNodePath === undefined ? undefined : treePath.getTenant(props.selectedNodePath);
      const selectedNamespaceNode = props.selectedNodePath === undefined ? undefined : treePath.getNamespace(props.selectedNodePath);
      const selectedTopicNode = props.selectedNodePath === undefined ? undefined : treePath.getTopic(props.selectedNodePath);
      const selectedTopicPartitionNode = props.selectedNodePath === undefined ? undefined : treePath.getTopicPartition(props.selectedNodePath);

      const isActive =
        selectedTenantNode !== undefined &&
        selectedNamespaceNode !== undefined &&
        selectedTopicNode !== undefined &&
        selectedTopicPartitionNode !== undefined &&
        treePath.areNodesEqual(selectedTenantNode, tenant) &&
        treePath.areNodesEqual(selectedNamespaceNode, namespace) &&
        treePath.areNodesEqual(selectedTopicNode, topic) &&
        treePath.areNodesEqual(selectedTopicPartitionNode, topicPartition);

      nodeContent = (
        <PulsarTopicPartition
          treeNode={topicPartition}
          leftIndent={leftIndent}
          onDoubleClick={toggleNodeExpanded}
          isActive={isActive}
        />
      );

      nodeIcon = (
        <TopicIcon
          isExpandable={false}
          isExpanded={isExpanded}
          isPartitioned={false}
          onClick={undefined}
          topicPersistency={topicPartition.persistency}
        />
      )
    }

    const handleNodeClick = async () => {
      switch (node.type) {
        case 'instance': await mutate(swrKeys.pulsar.tenants.listTenants._()); break;
        case 'tenant': await mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: treePath.getTenant(path)!.tenant })); break;
        case 'namespace': {
          await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.partitionedTopics._({ tenant: treePath.getTenant(path)!.tenant, namespace: treePath.getNamespace(path)!.namespace }));
          await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPartitionedTopics._({ tenant: treePath.getTenant(path)!.tenant, namespace: treePath.getNamespace(path)!.namespace }));
        }; break;
      }
    }

    const pathStr = stringify(path);

    return (
      <div
        key={`tree-node-${pathStr}`}
        className={s.Node}
        onClick={handleNodeClick}
      >
        <div className={s.NodeContent}>
          <span>&nbsp;</span>
          <div
            className={s.NodeIcon}
            style={{ marginLeft: leftIndent }}
          >
            {nodeIcon}
          </div>
          <span className={s.NodeTextContent}>{nodeContent}</span>
        </div>
      </div>
    );
  }

  const isTreeInUndefinedState = scrollToPath.state === 'in-progress' && scrollToPath.path.length !== 0 && filterQueryDebounced.length !== 0;

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
          <CredentialsButton />
        </div>
        <div>
          <SmallButton
            title="Collapse All"
            svgIcon={collapseAllIcon}
            onClick={() => setExpandedPaths([])}
            appearance='borderless-semitransparent'
            type='regular'
          />
          <SmallButton
            title="Select Current Resource"
            svgIcon={focusIcon}
            onClick={() => navigateToPath(props.selectedNodePath)}
            appearance='borderless-semitransparent'
            type='regular'
          />
        </div>
      </div>

      <div className={s.TreeContainer}>
        {(!isTreeInUndefinedState && !scrollToPath.isBeenFinishedOnce) && scrollToPath.state !== 'finished' && (
          <div className={s.Loading}>
            <span>Navigating o the selected resource...</span>
          </div>
        )}
        {isTreeInUndefinedState && !scrollToPath.isBeenFinishedOnce && (
          <div className={s.Loading}>
            <span>The tree is in a stuck state. Please decide:</span>
            <SmallButton
              text="Scroll to the selected resource"
              onClick={() => setFilterQuery('')}
              type='primary'
            />
            <SmallButton
              text="Apply filter"
              onClick={() => {
                setScrollToPath((scrollToPath) => ({ ...scrollToPath, path: [], cursor: 0, state: 'finished', isBeenFinishedOnce: true }));
              }}
              type='primary'
            />
          </div>
        )}
        {(!isTreeInUndefinedState || scrollToPath.isBeenFinishedOnce) && (
          <div
            ref={scrollParentRef}
            className={s.TreeScrollParent}
            style={{ opacity: scrollToPath.state === 'finished' ? 1 : 0 }}
          >
            <Virtuoso<FlattenTreeNode>
              ref={virtuosoRef}
              itemContent={(_, item) => renderTreeItem(item)}
              data={flattenTree}
              customScrollParent={scrollParentRef.current || undefined}
              defaultItemHeight={remToPx(40)}
              fixedItemHeight={remToPx(40)}
              components={{
                EmptyPlaceholder: () => <div className={s.Loading} style={{ width: 'calc(100% - 24rem)' }}>
                  <span>No items found. <br />Try another filter query.</span>
                </div>
              }}
              increaseViewportBy={{
                top: window.innerHeight,
                bottom: window.innerHeight
              }}
              totalCount={flattenTree.length}
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
