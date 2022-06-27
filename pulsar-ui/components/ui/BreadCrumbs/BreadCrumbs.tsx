import React from 'react';
import s from './BreadCrumbs.module.css'
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon } from '../Icons/Icons';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowIcon from '!!raw-loader!./arrow.svg';
import Link from '../../ui/LinkWithQuery/LinkWithQuery';
import { routes } from '../../routes';
import { mutate } from 'swr';
import { swrKeys } from '../../swrKeys';

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
      case 'namespace': href = routes.tenants.tenant.namespaces.namespace._.get({ tenant, namespace }); break;
      case 'persistent-topic': href = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic._.get({ tenant, namespace, topic, topicType: 'persistent' }); break;
      case 'non-persistent-topic': href = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic._.get({ tenant, namespace, topic, topicType: 'non-persistent' }); break;
    }

    const onClick = () => {
      switch (crumb.type) {
        case 'instance': mutate(swrKeys.pulsar.tenants._()); break;
        case 'tenant': mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant })); break;
        case 'namespace': mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.topics._({ tenant, namespace })); break;
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

  return (
    <div className={s.BreadCrumbs}>
      {props.crumbs.map((crumb, i) => renderCrumb(crumb, i, props.crumbs.length))}
    </div>
  );
}

export default BreadCrumbs;


export const BreadCrumbsAtPageTop: React.FC<BreadCrumbsProps> = (props) => {
  return (
    <div className={s.BreadCrumbsAtPageTop}>
      <BreadCrumbs {...props} />
    </div>
  );
}
