import React, { useEffect, useState, useRef, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import s from './NavigationTree.module.css'
import treeToFlattenTree, { getRootLabelName, FlattenTreeNode, TopicTreeNode, Tree, TreePath, treePath, TreeToFlattenTreeProps, TreeNode } from './TreeView';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as tenantPb from '../../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { updateTenants, updateTenantNamespaces, updateNamespaceTopics } from './tree-mutations';
import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../../Icons/Icons';
import { PulsarInstance, PulsarTenant, PulsarNamespace, PulsarTopic, PulsarTopicPartition } from './nodes';
import { swrKeys } from '../../../swrKeys';
import { useQueryParam, withDefault, StringParam } from 'use-query-params';
import { useDebounce } from 'use-debounce';
import stringify from 'safe-stable-stringify';
import { useNavigate } from 'react-router';
import { useTimeout } from '@react-hook/timeout';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import CredentialsButton from '../../../app/pulsar-auth/Button/Button';
import collapseAllIcon from './collapse-all.svg';
import focusIcon from './focus.svg';
import NothingToShow from '../../NothingToShow/NothingToShow';

type NavigationTreeProps = {
  selectedNodePath: TreePath;
}

const partitionRegexp = /^(.*)-(partition-\d+)$/g;
const pulsarTopicFqnRegex = /^(persistent|non-persistent):\/\/([\w-]+)\/([\w-]+)\/([\w-]+)$/;
const filterQuerySep = '/' as const;
function filterQueryToTreePath(query: string): TreePath {

  const queryParts: (string | undefined)[] = query.split(filterQuerySep).filter(p => p.length !== 0);
  const [tenant, namespace, topic, topicPartition] = queryParts;

  let treePath: TreePath = [];
  switch (queryParts.length) {
    case 1: {
      treePath = [{ type: "tenant", tenant: tenant! }]
    }; break;
    case 2: {
      treePath = [
        { type: "tenant", tenant: tenant! },
        { type: "namespace", tenant: tenant!, namespace: namespace! }
      ]
    }; break;
    case 3: {
      treePath = [
        { type: "tenant", tenant: tenant! },
        { type: "namespace", tenant: tenant!, namespace: namespace! },
        {
          type: "topic",
          tenant: tenant!,
          namespace: namespace!,
          topic: topic!,
          persistency: "persistent", // doesn't matter here
          partitioning: { type: 'non-partitioned' }, // doesn't matter here
          topicFqn: "" // doesn't matter here
        }
      ]
    }; break;
    case 4: {
      treePath = [
        { type: "tenant", tenant: tenant! },
        { type: "namespace", tenant: tenant!, namespace: namespace! },
        {
          type: "topic",
          tenant: tenant!,
          namespace: namespace!,
          topic: topic!,
          persistency: "persistent", // doesn't matter here
          partitioning: { type: 'non-partitioned' }, // doesn't matter here
          topicFqn: "" // doesn't matter here
        },
        {
          type: "topic-partition",
          tenant: tenant!,
          namespace: namespace!,
          topic: topic!,
          partition: topicPartition!,
          persistency: "persistent", // doesn't matter here
          partitioning: { type: 'non-partitioned' }, // doesn't matter here
          topicFqn: "" // doesn't matter here
        }
      ]
    }; break;
  }

  return treePath;
}

const NavigationTree: React.FC<NavigationTreeProps> = (props) => {
  const [tree, setTree] = useState<Tree>({ rootLabel: { name: "/", type: 'instance' }, subForest: [] });
  const [flattenTree, setFlattenTree] = useState<FlattenTreeNode[]>([]);
  const [filterQuery, setFilterQuery] = useQueryParam('q', withDefault(StringParam, ''));
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [filterPath, setFilterPath] = useState<TreePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<TreePath[]>([]);
  const [scrollToPath, setScrollToPath] = useState<{ path: TreePath, cursor: number, state: 'pending' | 'in-progress' | 'finished', isBeenFinishedOnce: boolean }>({ path: [], cursor: 0, state: 'pending', isBeenFinishedOnce: false });
  const [isTimedOutScrollToPathTimeout, startScrollToPathTimeout, resetScrollToPathTimeout] = useTimeout(15_000);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const [forceReloadKey] = useState<number>(0);
  const { notifyError } = Notifications.useContext();
  const { tenantServiceClient } = GrpcClient.useContext();
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
    setTree((tree) => updateTenants({
      tree,
      tenants: tenants ? tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []
    }));
  }, [tenants]);

  useEffect(() => {
    const treePath = filterQueryToTreePath(filterQueryDebounced);
    setFilterPath(treePath);
  }, [filterQueryDebounced]);

  useEffect(() => {
    const isTopicFqn = pulsarTopicFqnRegex.test(filterQuery.trim());
    if (!isTopicFqn) {
      return;
    }

    const [_, rest] = filterQuery.split("://");

    const [tenant, namespace, topic]: (string | undefined)[] = rest.split(filterQuerySep);
    const isPartition = partitionRegexp.test(filterQuery);
    const partition = topic.replace(partitionRegexp, "$2");
    const topicName = isPartition ? topic.replace(partitionRegexp, "$1") : topic;

    const newFilterQuery = partition === undefined ? `${tenant}/${namespace}/${topicName}` : `${tenant}/${namespace}/${topicName}/${partition}`;
    setFilterQuery(newFilterQuery);
  }, [filterQuery]);

  const navigateToPath = (path: TreePath) => {
    setScrollToPath((scrollToPath) => ({ ...scrollToPath, path, cursor: 0, state: 'in-progress' }));
    setExpandedPaths((expandedPaths) => treePath.uniquePaths([...expandedPaths, ...treePath.expandAncestors(path)]));
  }

  const scrollToItem = (index: number) => {
    if (!itemsContainerRef.current) {
      return;
    }

    Array.from(itemsContainerRef.current.children)[index].scrollIntoView(true);
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
        setTimeout(() => scrollToItem(nodeIndex));

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
    scrollToItem(0);
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

          if (filterPath.length !== 0) {
            return path.every((pathPart, i) => {
              const name = getRootLabelName(pathPart);
              const filterPathPart = filterPath[i] as TreeNode | undefined;
              const filterPathPartName = filterPathPart === undefined ? undefined : getRootLabelName(filterPathPart)

              if (filterPathPartName === undefined && filterQueryDebounced.endsWith(filterQuerySep) && i === filterPath.length) {
                return true;
              }

              if (filterPathPartName !== undefined && !filterQueryDebounced.endsWith(filterQuerySep) && name.startsWith(filterPathPartName)) {
                return true;
              }

              if (filterPathPartName !== undefined && filterQueryDebounced.endsWith(filterQuerySep) && name === filterPathPartName) {
                return true;
              }

              return false;
            });
          }

          if (path.length === 1) {
            return true;
          }

          const isHasPath = treePath.isAllAncestorsExpanded(expandedPaths, path);
          return isHasPath;
        })(),
        subForest: (() => true)(),
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
          onNamespaces={(namespaces) => setTree((tree) => updateTenantNamespaces({ tree, tenant: tenantNode.tenant, namespaces }))}
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
            return updateNamespaceTopics({ tree, tenant: tenant.tenant, namespace: namespace.namespace, persistentTopics: topics.persistent, nonPersistentTopics: topics.nonPersistent })
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
            title="Show Current Resource"
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
            className={s.TreeScrollParent}
            style={{ opacity: scrollToPath.state === 'finished' ? 1 : 0 }}
            ref={itemsContainerRef}
          >
            {flattenTree.length === 0 && <div style={{ padding: '12rem' }}><NothingToShow /></div>}
            {flattenTree.map(renderTreeItem)}
          </div>
        )}
      </div>

    </div>
  );
}

export default NavigationTree;
