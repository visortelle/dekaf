import { BreadCrumbsAtPageTop, CrumbType } from "../BreadCrumbs/BreadCrumbs";
import React from "react";
import s from "./PageNotFound.module.css";
import arrowBackIcon from "./icons/arrow-back.svg"
import { H1 } from "../H/H";
import { useNavigate } from "react-router";
import SmallButton from "../SmallButton/SmallButton";

type PageNotFoundProps = {

}

const PageNotFound: React.FC<PageNotFoundProps> = (props) => {
  const navigate = useNavigate();

  const pageNotFoundCrumb = {
    id: 'page-not-found',
    type: 'page-not-found' as CrumbType,
    value: '',
  }

  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop crumbs={[pageNotFoundCrumb]} />
      <div className={s.PageContent}>
        <div className={s.PageNotFoundTitle}>
          <H1>404 Not found</H1>
        </div>
        <p>The page you requested isn't found.</p>
        <SmallButton
          text="Go Back"
          svgIcon={arrowBackIcon}
          onClick={() => navigate(-1)}
          type="regular"
          appearance="borderless"
        />
      </div>
    </div>
  );
}

export default PageNotFound;
