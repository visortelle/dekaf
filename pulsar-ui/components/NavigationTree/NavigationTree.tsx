import React, { useCallback, useEffect } from 'react';
import useSWR from 'swr';
import s from './NavigationTree.module.css'
import TreeView, { Tree } from './TreeView';
import * as Notifications from '../contexts/Notifications';
import * as PulsarAdminClient from '../contexts/PulsarAdminClient';
import { setTenants, setTenantNamespaces, setNamespaceTopics } from './tree-mutations';

export type NavigationTreeProps = {
  pulsarInstance: string
};

const NavigationTree: React.FC<NavigationTreeProps> = (props) => {
  const [tree, setTree] = React.useState<Tree>({ rootLabel: { name: props.pulsarInstance, type: 'instance' }, subForest: [] });
  const [filterQuery, setFilterQuery] = React.useState<string>('');
  const [useRegex, setUseRegex] = React.useState<boolean>(false);
  const [expandedPaths, setExpandedPaths] = React.useState<string[]>([]);

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

  const expanded = useCallback((pathStr: string) => {
    return expandedPaths.includes(pathStr);
  }, [expandedPaths]);

  return (
    <div className={s.NavigationTree}>
      <input value={filterQuery} onChange={e => setFilterQuery(e.target.value)} />
      <input type="checkbox" checked={useRegex} onChange={() => setUseRegex(!useRegex)} />
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

                  return !tree.rootLabel.name.includes(filterQuery)
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

              const pathStr = JSON.stringify(path);
              const nodeIconOnClick = () => setExpandedPaths((expandedPaths) => expandedPaths.includes(pathStr) ? expandedPaths.filter(p => p !== pathStr) : expandedPaths.concat([pathStr]));
              const isExpanded = expanded(pathStr);

              if (node.type === 'instance') {
                nodeContent = node.name
              } else if (node.type === 'tenant') {
                const tenantName = path[0];

                nodeContent = (
                  <PulsarTenant
                    tenant={node.name}
                    onNamespaces={(namespaces) => setTree((tree) => setTenantNamespaces(tree, tenantName, namespaces))}
                  />
                );
                nodeIcon = (
                  <NodeIcon
                    title="te"
                    textColor='#fff'
                    backgroundColor='#276ff4'
                    onClick={nodeIconOnClick}
                    isExpanded={isExpanded}
                    isExpandable={true}
                  />
                );
                childrenCount = tree.subForest.find((ch) => ch.rootLabel.name === tenantName)?.subForest.length;
              } else if (node.type === 'namespace') {
                const tenantName = path[0];
                const namespaceName = path[1];

                nodeContent = (
                  <PulsarNamespace
                    tenant={tenantName}
                    namespace={namespaceName}
                    onTopics={(topics) => setTree((tree) => setNamespaceTopics(tree, tenantName, namespaceName, topics))}
                  />
                );
                nodeIcon = (
                  <NodeIcon
                    title="ns"
                    textColor='#fff'
                    backgroundColor='#fe6e6e'
                    onClick={nodeIconOnClick}
                    isExpanded={isExpanded}
                    isExpandable={true}
                  />
                );
                childrenCount = tree.subForest.find((ch) => ch.rootLabel.name === tenantName)?.subForest.find((ch) => ch.rootLabel.name === namespaceName)?.subForest.length;
              } else if (node.type === 'topic') {
                const tenantName = path[0];
                const namespaceName = path[1];

                const topicUrlParts = node.name.split('/');
                const topicName = topicUrlParts[topicUrlParts.length - 1];

                nodeContent = (
                  <PulsarTopic
                    tenant={tenantName}
                    namespace={namespaceName}
                    name={topicName}
                  />
                );
                nodeIcon = (
                  <NodeIcon
                    title="to"
                    textColor='#fff'
                    backgroundColor='#555'
                    onClick={() => undefined}
                    isExpanded={isExpanded}
                    isExpandable={false}
                  />
                );
              }

              return <div className={s.Node} style={{ paddingLeft: `${((path.length + 1) * 3 - 1)}ch` }}>
                <div className={s.NodeContent}>
                  {nodeIcon}
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
  tenant: string,
  onNamespaces: (namespaces: string[]) => void
}
const PulsarTenant: React.FC<PulsarTenantProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: namespaces, error: namespacesError } = useSWR(
    ['pulsar', 'tenants', props.tenant, 'namespaces'],
    async () => (await adminClient.namespaces.getTenantNamespaces(props.tenant)).map(tn => tn.split('/')[1]),
  );

  useEffect(() => props.onNamespaces(namespaces || []), [namespaces]);

  if (namespacesError) {
    notifyError(`Unable to fetch namespaces. ${namespacesError.toString()}`);
  }

  return <span>{props.tenant}</span>;
}

type PulsarNamespaceProps = {
  tenant: string,
  namespace: string,
  onTopics: (topics: string[]) => void
}
const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: topics, error: topicsError } = useSWR(
    ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'topics'],
    async () => await adminClient.namespaces.getTopics(props.tenant, props.namespace, "ALL"),
  );

  useEffect(() => props.onTopics(topics || []), [topics]);

  if (topicsError) {
    notifyError(`Unable to fetch namespace topics. ${topicsError.toString()}`);
  }

  return <span>{props.namespace}</span>;
}

type PulsarTopicProps = {
  tenant: string;
  namespace: string;
  name: string;
}
const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  return <span>{props.name}</span>
}

type NodeIconsProps = {
  title: string;
  textColor: string;
  backgroundColor: string;
  isExpandable: boolean;
  isExpanded: boolean;
  onClick: () => void
}
const NodeIcon: React.FC<NodeIconsProps> = (props) => {
  return (
    <div
      style={{ color: props.textColor, backgroundColor: props.backgroundColor }}
      className={`${s.NodeIcon} ${props.isExpanded ? s.NodeIconExpanded : ''} ${props.isExpandable ? s.NodeIconExpandable : ''}`}
      onClick={props.onClick}
    >
      {props.title}
    </div>
  );
}
