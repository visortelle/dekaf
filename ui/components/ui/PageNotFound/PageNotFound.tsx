import {routes} from "../../routes";
import {BreadCrumbsAtPageTop, CrumbType} from "../BreadCrumbs/BreadCrumbs";
import React from "react";
import s from "./PageNotFound.module.css";
import Link from "../Link/Link";
import SvgIcon from "../SvgIcon/SvgIcon";
import arrowBackIcon from "./icons/arrow-back.svg"

type PageNotFoundProps = {

}

const PageNotFound: React.FC<PageNotFoundProps> = (props) => {
  const pageNotFoundCrumb = {
    id: 'page-not-found',
    type: 'page-not-found' as CrumbType,
    value: 'Page not found',
  }

  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop crumbs={[pageNotFoundCrumb]}/>
      <div className={s.PageContent}>
        <div className={s.PageNotFoundTitle}>
          Page not found
        </div>
        <div className={s.PageNotFoundDescription}>
          <span>We're sorry, the page you requested could not be found.<br />It may be either under development, or does not exist.<br />If you have some questions, please contact us.</span>
        </div>
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