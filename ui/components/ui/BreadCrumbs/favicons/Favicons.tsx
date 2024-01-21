import React from "react";
import { Helmet } from "react-helmet-async";
import { Crumb } from "../BreadCrumbs";

import instanceFavicon from "./instance.png";
import tenantFavicon from "./tenant.png";
import namespaceFavicon from "./namespace.png";
import persistentTopicFavicon from "./persistent-topic.png";
import nonPersistentTopicFavicon from "./non-persistent-topic.png";

export type FaviconsProps = {
  crumbs: Crumb[];
};

const Favicons: React.FC<FaviconsProps> = (props) => {
  const crumbIndex = props.crumbs.findLastIndex((crumb) => crumb.type !== "link");
  const crumb = props.crumbs[crumbIndex];

  if (crumb === undefined) {
    return null;
  }

  let favicon;
  switch (crumb.type) {
    case "instance":
      favicon = instanceFavicon;
      break;
    case "tenant":
      favicon = tenantFavicon;
      break;
    case "namespace":
      favicon = namespaceFavicon;
      break;
    case "persistent-topic":
      favicon = persistentTopicFavicon;
      break;
    case "persistent-topic-partition":
      favicon = persistentTopicFavicon;
      break;
    case "persistent-topic-partitioned":
      favicon = persistentTopicFavicon;
      break;
    case "non-persistent-topic":
      favicon = nonPersistentTopicFavicon;
      break;
    case "non-persistent-topic-partition":
      favicon = nonPersistentTopicFavicon;
      break;
    case "non-persistent-topic-partitioned":
      favicon = nonPersistentTopicFavicon;
      break;
    default:
      favicon = undefined;
  }

  const pageTitle = crumb.type === 'persistent-topic-partition' || crumb.type === 'non-persistent-topic-partition' ?
    `${props.crumbs[crumbIndex - 1].value}-${crumb.value}` :
    crumb.value;

  return (
    <Helmet>
      {crumb && <title>{pageTitle}</title>}
      {favicon && <link rel="icon" type="image/png" href={favicon} />}
    </Helmet>
  );
};

export default Favicons;
