import React from 'react';
import s from './BreadCrumbs.module.css'
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../Icons/Icons';
import * as Notifications from '../../app/contexts/Notifications';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowIcon from '!!raw-loader!./arrow.svg';
import copyIcon from '!!raw-loader!./copy.svg';
import Link from '../../ui/LinkWithQuery/LinkWithQuery';
import { routes } from '../../routes';
import { mutate } from 'swr';
import { swrKeys } from '../../swrKeys';
import Button from '../Button/Button';

export type CrumbType = 'instance' | 'tenant' | 'namespace' | 'persistent-topic' | 'non-persistent-topic';
export type Crumb = {
  id: string;
  type: CrumbType;
  value: string
};

export type BreadCrumbsProps = {
  crumbs: Crumb[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = (props) => {
  const tenant = props.crumbs[1]?.value;
  const namespace = props.crumbs[2]?.value;
  const topic = props.crumbs[3]?.value;
  const { notifySuccess } = Notifications.useContext();

  const renderCrumb = (crumb: Crumb, i: number, total: number) => {
    let icon = null;
    switch (crumb.type) {
      case 'instance': icon = <InstanceIcon />; break;
      case 'tenant': icon = <TenantIcon />; break;
      case 'namespace': icon = <NamespaceIcon />; break;
      case 'persistent-topic': icon = <TopicIcon topicType='persistent' />; break;
      case 'non-persistent-topic': icon = <TopicIcon topicType='non-persistent' />; break;
    }

    const isLast = i === total - 1;

    let href = '#';
    switch (crumb.type) {
      case 'instance': href = routes.instance.tenants._.get(); break;
      case 'tenant': href = routes.tenants.tenant.namespaces._.get({ tenant }); break;
      case 'namespace': href = routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant, namespace }); break;
      case 'persistent-topic': href = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant, namespace, topic, topicType: 'persistent' }); break;
      case 'non-persistent-topic': href = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant, namespace, topic, topicType: 'non-persistent' }); break;
    }

    const onClick = () => {
      switch (crumb.type) {
        case 'instance': mutate(swrKeys.pulsar.tenants._()); break;
        case 'tenant': mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant })); break;
        case 'namespace': {
          mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant, namespace }));
          mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant, namespace }));
        }; break;
      }
    }

    return (
      <Link key={crumb.id} className={s.Crumb} to={href} onClick={onClick}>
        <div className={s.CrumbIcon}>{icon}</div>
        <div className={s.CrumbTitle}>{crumb.value}</div>
        {!isLast && <div className={s.CrumbArrow}><SvgIcon svg={arrowIcon} /></div>}
      </Link>
    );
  }

  const qualifiedResourceName = crumbsToQualifiedName(props.crumbs);
  return (
    <div className={s.BreadCrumbs}>
      {props.crumbs.map((crumb, i) => renderCrumb(crumb, i, props.crumbs.length))}

      {qualifiedResourceName !== undefined && (
        <div className={s.CopyNameButton}>
          <Button
            onClick={() => {
              if (qualifiedResourceName !== undefined) {
                navigator.clipboard.writeText(qualifiedResourceName);
                notifySuccess(<div>Fully qualified resource name copied to clipboard: {qualifiedResourceName}</div>);
              }
            }}
            svgIcon={copyIcon}
            type={'regular'}
            title="Copy path to clipboard"
          />
        </div>
      )}
    </div>
  );
}

function crumbsToQualifiedName(crumbs: Crumb[]): string | undefined {
  const tenant = crumbs[1]?.value;
  const namespace = crumbs[2]?.value;
  const topic = crumbs[3]?.value;

  switch (crumbs[crumbs.length - 1].type) {
    case 'tenant': return tenant;
    case 'namespace': return `${tenant}/${namespace}`;
    case 'persistent-topic': return `${'persistent'}://${tenant}/${namespace}/${topic}`;
    case 'non-persistent-topic': return `${'non-persistent'}://${tenant}/${namespace}/${topic}`;
    default: return undefined;
  }
}

export default BreadCrumbs;


export const BreadCrumbsAtPageTop: React.FC<BreadCrumbsProps> = (props) => {
  return (
    <div className={s.BreadCrumbsAtPageTop}>
      <BreadCrumbs {...props} />
    </div>
  );
}
