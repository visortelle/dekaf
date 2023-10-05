import React from "react";
import s from "./BreadCrumbs.module.css";
import { TenantIcon, NamespaceIcon, TopicIcon, InstanceIcon, SubscriptionIcon } from "../Icons/Icons";
import * as AppContext from '../../app/contexts/AppContext';
import * as Notifications from "../../app/contexts/Notifications";
import SvgIcon from "../SvgIcon/SvgIcon";
import arrowIcon from "./arrow.svg";
import copyIcon from "./copy.svg";
import Link from "../Link/Link";
import { routes } from "../../routes";
import { mutate } from "swr";
import { swrKeys } from "../../swrKeys";
import Favicons from "./favicons/Favicons";
import SmallButton from "../SmallButton/SmallButton";
import { useLocation } from "react-router-dom";

export type CrumbType =
  "instance" |
  "tenant" |
  "namespace" |
  "persistent-topic" |
  "non-persistent-topic" |
  "subscription" |
  "link";

export type Crumb = {
  id: string;
  type: CrumbType;
  value: string;
};

export type BreadCrumbsProps = {
  crumbs: Crumb[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = (props) => {
  const { config } = AppContext.useContext();
  const tenant = props.crumbs[1]?.value;
  const namespace = props.crumbs[2]?.value;
  const topic = props.crumbs[3]?.value;
  const { notifySuccess } = Notifications.useContext();
  const { pathname } = useLocation();

  const renderCrumb = (crumb: Crumb, i: number, total: number) => {
    let icon = null;
    switch (crumb.type) {
      case "instance":
        icon = <InstanceIcon />;
        break;
      case "tenant":
        icon = <TenantIcon />;
        break;
      case "namespace":
        icon = <NamespaceIcon />;
        break;
      case "persistent-topic":
        icon = <TopicIcon topicPersistency='persistent' />;
        break;
      case "non-persistent-topic":
        icon = <TopicIcon topicPersistency='non-persistent' />;
        break;
      case "subscription":
        icon = <SubscriptionIcon />;
        break;
    }

    const isLast = i === total - 1;

    let href = "#";
    let className = '';
    switch (crumb.type) {
      case "instance":
        href = routes.instance.tenants._.get();
        break;
      case "tenant":
        href = routes.tenants.tenant.namespaces._.get({ tenant });
        break;
      case "namespace":
        href = routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant, namespace });
        break;
      case "persistent-topic":
        href = routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.messages._.get({
          tenant,
          namespace,
          topic,
          topicPersistency: "persistent",
        });
        break;
      case "non-persistent-topic":
        href = routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.messages._.get({
          tenant,
          namespace,
          topic,
          topicPersistency: "non-persistent",
        });
        break;
      case "link":
        href = pathname;
        className = s.LinkCrumb;
        break;
    }

    const onClick = () => {
      switch (crumb.type) {
        case "instance":
          mutate(swrKeys.pulsar.tenants.listTenants._());
          break;
        case "tenant":
          mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant }));
          break;
        case "namespace": {
          mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant, namespace }));
          mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant, namespace }));
        }
          break;
      }
    };

    const crumbValue = crumb.type === 'instance' ? (config.pulsarName || 'Pulsar Instance') : crumb.value;

    return (
      <Link
        key={crumb.id}
        className={`${s.Crumb} ${className}`}
        to={href}
        onClick={onClick}
      >
        {icon ? <div className={s.CrumbIcon}>{icon}</div> : null}
        <div className={s.CrumbTitle} title={crumbValue}>{crumbValue}</div>
        {!isLast && (
          <div className={s.CrumbArrow}>
            <SvgIcon svg={arrowIcon} />
          </div>
        )}
      </Link>
    );
  };

  const qualifiedResourceName = crumbsToQualifiedName(props.crumbs);
  return (
    <>
      <Favicons crumbs={props.crumbs} />
      <div className={s.BreadCrumbs}>
        {qualifiedResourceName !== undefined && (
          <div className={s.CopyNameButton}>
            <SmallButton
              onClick={() => {
                if (qualifiedResourceName !== undefined) {
                  navigator.clipboard.writeText(qualifiedResourceName);
                  notifySuccess(<div>Fully qualified resource name copied to clipboard: {qualifiedResourceName}</div>);
                }
              }}
              svgIcon={copyIcon}
              type={"regular"}
              title="Copy fully qualified resource name to clipboard."
            />
          </div>
        )}

        {props.crumbs.map((crumb, i) => renderCrumb(crumb, i, props.crumbs.length))}
      </div>
    </>
  );
};

function crumbsToQualifiedName(crumbs: Crumb[]): string | undefined {
  const tenant = crumbs[1]?.value;
  const namespace = crumbs[2]?.value;
  const topic = crumbs[3]?.value;

  const currentResource = crumbs.findLast((crumb) => crumb.type !== "link");

  switch (currentResource?.type) {
    case "tenant":
      return tenant;
    case "namespace":
      return `${tenant}/${namespace}`;
    case "persistent-topic":
      return `${"persistent"}://${tenant}/${namespace}/${topic}`;
    case "non-persistent-topic":
      return `${"non-persistent"}://${tenant}/${namespace}/${topic}`;
    default:
      return undefined;
  }
}

export default BreadCrumbs;

export const BreadCrumbsAtPageTop: React.FC<BreadCrumbsProps> = (props) => {
  return (
    <div className={s.BreadCrumbsAtPageTop}>
      <BreadCrumbs {...props} />
    </div>
  );
};
