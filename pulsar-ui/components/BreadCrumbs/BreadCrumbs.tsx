import React from 'react';
import s from './BreadCrumbs.module.css'
import { TenantIcon, NamespaceIcon, TopicIcon } from '../Icons/Icons';
import SvgIcon from '../ui/SvgIcon/SvgIcon';
import arrowIcon from '!!raw-loader!./arrow.svg';
import { Link } from 'react-router-dom';

export type CrumbType = 'tenant' | 'namespace' | 'persistent-topic' | 'non-persistent-topic';
export type Crumb = {
  id: string;
  type: CrumbType;
  value: string
};

export type BreadCrumbsProps = {
  crumbs: Crumb[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = (props) => {
  const tenant = props.crumbs[0]?.value;
  const namespace = props.crumbs[1]?.value;
  const topic = props.crumbs[2]?.value;

  const renderCrumb = (crumb: Crumb, i: number, total: number) => {
    let icon = null;
    switch (crumb.type) {
      case 'tenant': icon = <TenantIcon />; break;
      case 'namespace': icon = <NamespaceIcon />; break;
      case 'persistent-topic': icon = <TopicIcon topicType='persistent' />; break;
      case 'non-persistent-topic': icon = <TopicIcon topicType='non-persistent' />; break;
    }

    const isLast = i === total - 1;

    let href = '#';
    switch (crumb.type) {
      case 'tenant': href = `/tenants/${tenant}`; break;
      case 'namespace': href = `/tenants/${tenant}/namespaces/${namespace}`; break;
      case 'persistent-topic': href = `/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topic}`; break;
      case 'non-persistent-topic': href = `/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topic}`; break;
    }

    return (
      <Link key={crumb.id} className={s.Crumb} to={href}>
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
