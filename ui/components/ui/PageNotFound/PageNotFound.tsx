import {routes} from "../../routes";
import {BreadCrumbsAtPageTop, CrumbType} from "../BreadCrumbs/BreadCrumbs";
import React from "react";
import s from "./PageNotFound.module.css";
import Link from "../Link/Link";
import SvgIcon from "../SvgIcon/SvgIcon";
import arrowBackIcon from "./icons/arrow-back.svg"
import { H1 } from "../H/H";

type PageNotFoundProps = {

}

const PageNotFound: React.FC<PageNotFoundProps> = (props) => {
  const pageNotFoundCrumb = {
    id: 'page-not-found',
    type: 'page-not-found' as CrumbType,
    value: '',
  }

  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop crumbs={[pageNotFoundCrumb]}/>
      <div className={s.PageContent}>
        <div className={s.PageNotFoundTitle}>
          <H1>404 Not found</H1>
        </div>
        <p>The page you requested isn't found.</p>
        <div className={s.BackToHomeWrapper}>
          <SvgIcon svg={arrowBackIcon} />
          <Link className={s.BackToHome} to={routes.instance.tenants._.path}>
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}

export default PageNotFound;
