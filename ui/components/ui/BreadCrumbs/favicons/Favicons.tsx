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
  const crumb = props.crumbs[props.crumbs.length - 1];

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
    case "non-persistent-topic":
      favicon = nonPersistentTopicFavicon;
      break;
    default:
      favicon = undefined;
  }

  console.log(favicon)

  return (
    <Helmet>
      {crumb && <title>{crumb.value}</title>}
      {favicon && <link rel="icon" type="image/png" href={`data:image/png;base64,${favicon}`} />}
    </Helmet>
  );
};

export default Favicons;
