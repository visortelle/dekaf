import React, { useCallback, useEffect } from 'react';
import useSWR from 'swr';
import s from './NavigationTree.module.css'
import TreeView, { Tree } from './TreeView';
import * as Notifications from '../contexts/Notifications';
import * as PulsarAdminClient from '../contexts/PulsarAdminClient';
import { setTenants, setTenantNamespaces, setNamespaceTopics, expandAll } from './tree-mutations';
import { NavLink } from 'react-router-dom';
import Input from '../ui/Input/Input';
import SmallButton from '../ui/SmallButton/SmallButton';
import { TenantIcon, NamespaceIcon, TopicIcon } from '../Icons/Icons';

const NavigationTree: React.FC = () => {
  const [tree, setTree] = React.useState<Tree>({ rootLabel: { name: "/", type: 'instance' }, subForest: [] });
  const [filterQuery, setFilterQuery] = React.useState<string>('');
  const [useRegex, _] = React.useState<boolean>(false);
  const [expandedPaths, setExpandedPaths] = React.useState<string[]>([]);
  const [nodeTypeFilter, setNodeTypeFilter] = React.useState<{ showTenants: boolean, showNamespaces: boolean, showTopics: boolean }>({ showTenants: true, showNamespaces: true, showTopics: true });
  const [forceReloadKey, setForceReloadKey] = React.useState<number>(0);

  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: tenants, error: tenantsError } = useSWR(
    ['pulsar', 'tenants'],
    async () => await adminClient.tenants.getTenants()
  );

  if (tenantsError) {
    notifyError(`Unable to fetch tenants. ${tenantsError.toString()}`);
  }

  useEffect(() => {
    setTree((tree) => setTenants(tree, tenants || []));
  }, [tenants]);

  useEffect(() => {
    setForceReloadKey((key) => key + 1);
  }, [nodeTypeFilter]);

  const expanded = useCallback((pathStr: string) => {
    return expandedPaths.includes(pathStr);
  }, [expandedPaths]);

  return (
    <div className={s.NavigationTree}>
      <div className={s.FilterQueryInput}>
        <Input placeholder="Filter" value={filterQuery} onChange={v => setFilterQuery(v)} />
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
          onClick={() => setNodeTypeFilter((nodeTypeFilter) => ({ ...nodeTypeFilter, showTopics: !nodeTypeFilter.showTopics }))}
          className={s.NodeTypeFilterButton}
          isGray={!nodeTypeFilter.showTopics}
        />
      </div>
      <TreeView
        nodeCommons={{}}
        getPathPart={(node) => node.rootLabel.name}
        path={[]}
        renderNode={(node, path, nodeCommons) => {
          return ({
            alterTree: (tree, path) => tree,
            cssClasses: {
              node: '',
              rootLabel: '',
              subForest: ''
            },
            getVisibility: (tree, path) => ({
              rootLabel: (() => {
                if (path.length === 0) {
                  return false;
                }

                if (filterQuery.length !== 0) {
                  if (useRegex) {
                    const regex = new RegExp(filterQuery, 'g');
                    return regex.test(tree.rootLabel.name);
                  }

                  return tree.rootLabel.name.includes(filterQuery)
                }

                if (tree.rootLabel.type === 'tenant' && !nodeTypeFilter.showTenants) {
                  return false;
                }

                if (tree.rootLabel.type === 'namespace' && !nodeTypeFilter.showNamespaces) {
                  return false;
                }

                if (tree.rootLabel.type === 'topic' && !nodeTypeFilter.showTopics) {
                  return false;
                }

                return true;
              })(),
              subForest: (() => {
                if (path.length === 0) {
                  return true;
                }
                const pathStr = JSON.stringify(path);
                const isExpanded = expanded(pathStr);
                return isExpanded;
              })(),
              tree: true
            }),
            rootLabel: (() => {
              let nodeContent: React.ReactNode = null;
              let nodeIcon = null;
              let childrenCount = null;
              const leftIndent = `${((path.length + 1) * 3 - 1)}ch`;

              const pathStr = JSON.stringify(path);
              const toggleNodeExpanded = () => setExpandedPaths((expandedPaths) => expandedPaths.includes(pathStr) ? expandedPaths.filter(p => p !== pathStr) : expandedPaths.concat([pathStr]));
              const isExpanded = expanded(pathStr);

              if (node.type === 'instance') {
                nodeContent = node.name
              } else if (node.type === 'tenant') {
                const tenantName = path[0];

                nodeContent = (
                  <PulsarTenant
                    forceReloadKey={forceReloadKey}
                    tenant={node.name}
                    onNamespaces={(namespaces) => setTree((tree) => setTenantNamespaces(tree, tenantName, namespaces))}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                  />
                );
                nodeIcon = <TenantIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
                childrenCount = tree.subForest.find((ch) => ch.rootLabel.name === tenantName)?.subForest.length;
              } else if (node.type === 'namespace') {
                const tenantName = path[0];
                const namespaceName = path[1];

                nodeContent = (
                  <PulsarNamespace
                    forceReloadKey={forceReloadKey}
                    tenant={tenantName}
                    namespace={namespaceName}
                    onTopics={(topics) => setTree((tree) => setNamespaceTopics(tree, tenantName, namespaceName, topics))}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                  />
                );
                nodeIcon = <NamespaceIcon onClick={toggleNodeExpanded} isExpandable={true} isExpanded={isExpanded} />;
                childrenCount = tree.subForest.find((ch) => ch.rootLabel.name === tenantName)?.subForest.find((ch) => ch.rootLabel.name === namespaceName)?.subForest.length;
              } else if (node.type === 'topic') {
                const tenantName = path[0];
                const namespaceName = path[1];
                const topicName = node.name;

                nodeContent = (
                  <PulsarTopic
                    tenant={tenantName}
                    namespace={namespaceName}
                    topic={topicName}
                    leftIndent={leftIndent}
                    onDoubleClick={toggleNodeExpanded}
                  />
                );
                nodeIcon = <TopicIcon isExpandable={false} isExpanded={false} onClick={() => undefined} />
              }

              return <div className={s.Node}>
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

type PulsarTenantProps = {
  forceReloadKey: number;
  tenant: string;
  onNamespaces: (namespaces: string[]) => void;
  leftIndent: string;
  onDoubleClick: () => void;
}
const PulsarTenant: React.FC<PulsarTenantProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: namespaces, error: namespacesError } = useSWR(
    ['pulsar', 'tenants', props.tenant, 'namespaces'],
    async () => (await adminClient.namespaces.getTenantNamespaces(props.tenant)).map(tn => tn.split('/')[1]),
  );

  useEffect(() => props.onNamespaces(namespaces || []), [namespaces, props.forceReloadKey]);

  if (namespacesError) {
    notifyError(`Unable to fetch namespaces. ${namespacesError.toString()}`);
  }

  return (
    <NavLink
      to={`/tenants/${props.tenant}/namespaces`}
      end
      className={({ isActive }) => `${s.NodeLink} ${isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.tenant}</span>
    </NavLink>
  );
}

type PulsarNamespaceProps = {
  forceReloadKey: number,
  tenant: string;
  namespace: string;
  onTopics: (topics: string[]) => void;
  leftIndent: string;
  onDoubleClick: () => void;
}
const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: topics, error: topicsError } = useSWR(
    ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'topics'],
    async () => await (await adminClient.namespaces.getTopics(props.tenant, props.namespace, "ALL")).map(tn => {
      const topicUrlParts = tn.split('/');
      return topicUrlParts[topicUrlParts.length - 1];
    }),
  );

  useEffect(() => props.onTopics(topics || []), [topics, props.forceReloadKey]);

  if (topicsError) {
    notifyError(`Unable to fetch namespace topics. ${topicsError.toString()}`);
  }

  return (
    <NavLink
      to={`/tenants/${props.tenant}/namespaces/${props.namespace}`}
      end
      className={({ isActive }) => `${s.NodeLink} ${isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.namespace}</span>
    </NavLink>
  );
}

type PulsarTopicProps = {
  tenant: string;
  namespace: string;
  topic: string;
  leftIndent: string;
  onDoubleClick: () => void;
}
const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  return (
    <NavLink
      to={`/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topic}`}
      end
      className={({ isActive }) => `${s.NodeLink} ${isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.topic}</span>
    </NavLink>
  );
}
