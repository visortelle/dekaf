import React from 'react';
import s from './TopicPage.module.css'

export type TopicPageProps = {};

const TopicPage: React.FC<TopicPageProps> = (props) => {
  return (
    <div className={s.TenantPage}>topic page</div>
  );
}

export default TopicPage;
