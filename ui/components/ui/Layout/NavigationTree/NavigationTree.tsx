import React, {useEffect, useState, useRef, useMemo} from 'react';
import useSWR, { mutate } from 'swr';
import s from './NavigationTree.module.css'
import {TreeNodeType, TreePath} from './utils/tree-path-utils';
import {Tree} from "./utils/tree-utils";
import treeToPlainTree, {PlainTreeNode, TreeToPlainTreeProps} from './utils/plain-tree-utils';
import TreePathUtils from './utils/tree-path-utils';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as tenantPb from '../../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { setTenants, setTenantNamespaces, setNamespaceTopics } from './utils/tree-utils';
import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../../Icons/Icons';
import {PulsarInstance, PulsarInstanceProps} from "./Nodes/PulsarInstance";
import {PulsarTenant, PulsarTenantProps} from "./Nodes/PulsarTenant";
import {PulsarNamespace, PulsarNamespaceProps} from "./Nodes/PulsarNamespace";
import {PulsarTopic, PulsarTopicProps} from "./Nodes/PulsarTopic";
import { swrKeys } from '../../../swrKeys';
import { useDebounce } from 'use-debounce';
import stringify from 'safe-stable-stringify';
import { isEqual } from 'lodash';
import { ListItem, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useNavigate } from 'react-router';
import { useTimeout } from '@react-hook/timeout';
import { remToPx } from '../../rem-to-px';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import CredentialsButton from '../../../app/pulsar-auth/Button/Button';
import collapseAllIcon from './icons/collapse-all.svg';

type NavigationTreeProps = React.HTMLAttributes<HTMLDivElement> & {
  selectedNodePath: TreePath;
  isTreeControlButtonsHidden?: boolean;
  isInstanceNodeHidden?: boolean;
  isToggleOnNodeClick?: boolean;
  nodesRender?: {
    instanceRender?: (props: PulsarInstanceProps) => React.ReactElement;
    tenantRender: (props: PulsarTenantProps) => React.ReactElement;
    namespaceRender: (props: PulsarNamespaceProps) => React.ReactElement;
    topicRender: (props: PulsarTopicProps) => React.ReactElement;
  };
}

const filterQuerySep = '/';

const NavigationTree: React.FC<NavigationTreeProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [tree, setTree] = useState<Tree>({ rootLabel: { name: "/", type: 'instance' }, subForest: [] });
  const [plainTree, setPlainTree] = useState<PlainTreeNode[]>([]);
  const [filterQuery, setFilterQuery] = useState<string>(""); //useQueryParam('q', withDefault(StringParam, ''));
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [filterPath, setFilterPath] = useState<TreePath>([]);
  const [expandedPaths, setExpandedPaths] = useState<TreePath[]>([]);
  const [scrollToPath, setScrollToPath] = useState<{ path: TreePath, cursor: number, state: 'pending' | 'in-progress' | 'finished' }>({ path: [], cursor: 0, state: 'pending' });
  const [isTimedOutScrollToPathTimeout, startScrollToPathTimeout, resetScrollToPathTimeout] = useTimeout(5000);
  const [itemsRendered, setItemsRendered] = useState<ListItem<PlainTreeNode>[]>([]);
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

  const tenants = useMemo(() => tenantsData?.getTenantsList() ?? [] , [tenantsData]);

  useEffect(() => {
    setTree((tree) => setTenants({
      tree,
      tenants: tenants ? tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []
    })
    );
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
      setExpandedPaths((expandedPaths) => TreePathUtils.uniquePaths([...expandedPaths, ...TreePathUtils.expandAncestors(props.selectedNodePath)]));
    }
  }, [props.selectedNodePath]);

  // XXX - Handle scroll to selected node. It can be quite buggy. Re-test it carefully.
  useEffect(() => {
    if (scrollToPath.state === 'finished') {
      return;
    }

    if (scrollToPath.state === 'in-progress') {
      const pathToFind = scrollToPath.path.slice(0, scrollToPath.cursor + 1);
      const nodeIndex = plainTree.findIndex(p => TreePathUtils.arePathsEqual(p.nodePath, pathToFind));

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
                return i === filterPath.length - 1 ? part.name.includes(filterPath[filterPath.length - 1].name) : part.name === filterPath[i]?.name;
              });

              const b = path.length === filterPath.length && filterPath[filterPath.length - 1]?.name === '' && filterPath[filterPath.length - 2]?.name === path[path.length - 2]?.name;
              return a || b;
            }

            return tree.rootLabel.name.includes(filterQueryDebounced)
          }

          return path.length === 1 ? true : TreePathUtils.hasPath(expandedPaths, path.slice(0, path.length - 1));
        })(),
        subForest: (() => {
          if (path.length === 0) {
            return true;
          }

          if (filterPath.length > 0 && filterPath[path.length - 1]?.name === path[path.length - 1].name) {
            return true;
          }

          return TreePathUtils.isPathExpanded(expandedPaths, path);
        })(),
      }),
    }
    setPlainTree(() => treeToPlainTree(treeToPlainTreeProps));
  }, [expandedPaths, filterPath, filterQueryDebounced, tree]);

  const renderTreeItem = (node: PlainTreeNode) => {
    const { type: nodeType, name: nodeName, nodePath } = node;
    let nodeContent: React.ReactNode = null;
    let nodeIcon = null;

    const leftIndent = nodeType === 'instance' ? '5ch' : `${((nodePath.length + 1) * 3 - 1)}ch`;

    if (props.isInstanceNodeHidden && nodeType === 'instance')
      return <></>;

    const toggleNodeExpanded = () => setExpandedPaths(
      (expandedPaths) => TreePathUtils.hasPath(expandedPaths, nodePath) ?
        expandedPaths.filter(p => !TreePathUtils.arePathsEqual(p, nodePath)) :
        expandedPaths.concat([nodePath])
    );

    const isExpanded = TreePathUtils.isPathExpanded(expandedPaths, nodePath);

    const nodeStateSetters: Record<TreeNodeType, (nodeType: TreeNodeType) => void> = {
      'instance': () => {
        const isActive = props.selectedNodePath.length === 0;

        nodeContent = (
          <PulsarInstance
            forceReloadKey={forceReloadKey}
            leftIndent={leftIndent}
            onDoubleClick={toggleNodeExpanded}
            isActive={isActive}
            customRender={props.nodesRender?.instanceRender || undefined}
          />
        );
        nodeIcon = <InstanceIcon onClick={toggleNodeExpanded} isExpandable={false} isExpanded={isExpanded} />;
      },
      'tenant': () => {
        const tenant = TreePathUtils.getTenant(nodePath)!;

        const isActive = TreePathUtils.areNodesEqual(TreePathUtils.getTenant(props.selectedNodePath)!, tenant) && TreePathUtils.getNamespace(props.selectedNodePath) === undefined;

        nodeContent = (
          <PulsarTenant
            forceReloadKey={forceReloadKey}
            tenant={nodeName}
            onNamespaces={(namespaces) => setTree((tree) => setTenantNamespaces({ tree, tenant: tenant.name, namespaces }))}
            leftIndent={leftIndent}
            onDoubleClick={toggleNodeExpanded}
            isActive={isActive}
            isFetchData={isExpanded || TreePathUtils.getTenant(filterPath)?.name === nodeName}
            customRender={props.nodesRender?.tenantRender || undefined}
          />
        );
        nodeIcon = <TenantIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
      },
      'namespace': () => {
        const tenant = TreePathUtils.getTenant(nodePath)!;
        const namespace = TreePathUtils.getNamespace(nodePath)!;

        const isActive = TreePathUtils.areNodesEqual(TreePathUtils.getTenant(props.selectedNodePath)!, tenant) &&
          TreePathUtils.areNodesEqual(TreePathUtils.getNamespace(props.selectedNodePath)!, namespace) && TreePathUtils.getTopic(props.selectedNodePath) === undefined;

        nodeContent = (
          <PulsarNamespace
            forceReloadKey={forceReloadKey}
            tenant={tenant.name}
            namespace={namespace.name}
            onTopics={(topics) => setTree((tree) => setNamespaceTopics({ tree, tenant: tenant.name, namespace: namespace.name, persistentTopics: topics.persistent, nonPersistentTopics: topics.nonPersistent }))}
            leftIndent={leftIndent}
            onDoubleClick={toggleNodeExpanded}
            isActive={isActive}
            isFetchData={isExpanded || TreePathUtils.getNamespace(filterPath)?.name === nodeName}
            customRender={props.nodesRender?.namespaceRender || undefined}
          />
        );
        nodeIcon = <NamespaceIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
      },
      'persistent-topic' : (node) => {
        topicStateSetters(node);
      },
      'non-persistent-topic': (node) => {
        topicStateSetters(node);
      },
    };
    const topicStateSetters = (nodeType: TreeNodeType) => {
      const tenant = TreePathUtils.getTenant(nodePath)!;
      const namespace = TreePathUtils.getNamespace(nodePath)!;

      const topicName = nodeName;
      const topicType = nodeType === 'persistent-topic' ? 'persistent' : 'non-persistent';

      const isActive = TreePathUtils.areNodesEqual(TreePathUtils.getTenant(props.selectedNodePath)!, tenant) &&
        TreePathUtils.areNodesEqual(TreePathUtils.getNamespace(props.selectedNodePath)!, namespace) &&
        TreePathUtils.areNodesEqual(
          TreePathUtils.getTopic(props.selectedNodePath)!, { name: topicName, type: topicType === 'persistent' ? 'persistent-topic' : 'non-persistent-topic' }
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
          isFetchData={isExpanded || TreePathUtils.getTopic(filterPath)?.name === nodeName}
          customRender={props.nodesRender?.topicRender || undefined}
        />
      );
      nodeIcon = (
        <TopicIcon
          isExpandable={false}
          isExpanded={false}
          onClick={() => undefined}
          topicType={topicType}
        />
      );
    }
    const setNodeContentAndIcon = (nodeType: TreeNodeType) => {
      const treeHandler = nodeStateSetters[nodeType];

      if(treeHandler) {
        treeHandler(nodeType);
      }
      else {
        notifyError(`Error during handling node:\n Unknown node type: ${nodeType}`);
      }
    };

    setNodeContentAndIcon(nodeType);

    const handleNodeClick = async () => {
      switch (nodeType) {
        case 'instance': await mutate(swrKeys.pulsar.tenants.listTenants._()); break;
        case 'tenant': await mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: TreePathUtils.getTenant(nodePath)!.name })); break;
        case 'namespace': {
          await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: TreePathUtils.getTenant(nodePath)!.name, namespace: TreePathUtils.getNamespace(nodePath)!.name }));
          await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: TreePathUtils.getTenant(nodePath)!.name, namespace: TreePathUtils.getNamespace(nodePath)!.name }));
        } break;
      }
    }

    const pathStr = stringify(nodePath);

    return (
      <div key={`tree-node-${pathStr}`} className={s.Node} onClick={() => {handleNodeClick(); props.isToggleOnNodeClick && toggleNodeExpanded();}}
           title={node.nodePath.map(p => p.name).join('/')}>
        <div className={s.NodeContent}>
          <span>&nbsp;</span>
          <div className={s.NodeIcon} style={{marginLeft: leftIndent}}>{nodeIcon}</div>
          <span className={`${s.NodeTextContent} ${props.nodesRender && s.NodeTextContentOuterUsage}`}>{nodeContent}</span>
        </div>
      </div>
    );
  }

  const isTreeInStuckState = scrollToPath.state === 'in-progress' && scrollToPath.path.length !== 0 && filterQueryDebounced.length !== 0;

  return (
    <div className={`${s.NavigationTree} ${props.className}`}>
      <div className={s.FilterQueryInput}>
        <Input
          placeholder="tenant/namespace/topic"
          value={filterQuery}
          onChange={v => setFilterQuery(v)}
          clearable={true}
          focusOnMount={true}
        />
      </div>
      <div className={`${s.TreeControlButtons} ${props.isTreeControlButtonsHidden ? s.Hidden : ''}`}>
        <CredentialsButton />
        <SmallButton
          title="Collapse All"
          svgIcon={collapseAllIcon}
          onClick={() => setExpandedPaths([])}
          type='regular'
        />
      </div>

      <div className={s.TreeContainer}>
        {!isTreeInStuckState && scrollToPath.state !== 'finished' && (
          <div className={s.Loading}>
            <span>Navigating to the selected resource...</span>
          </div>
        )}
        {isTreeInStuckState && (
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
              defaultItemHeight={remToPx(40)}
              fixedItemHeight={remToPx(40)}
              components={{
                EmptyPlaceholder: () =>
                  <div className={s.Loading} style={{ width: 'calc(100% - 24rem)' }}>
                    <span>No items found. <br />Try another filter query.</span>
                  </div>
              }}
              increaseViewportBy={{ top: window.innerHeight / 2, bottom: window.innerHeight / 2 }}
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
