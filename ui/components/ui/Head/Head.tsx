import React from 'react';
import { Helmet } from 'react-helmet';

type Props = {
  page: 'topic' | 'namespace' | 'tenant' | 'instance'
}
const Head = (props: Props) => {

  const { page } = props;

  return (
    <Helmet>
        <link rel="icon" type="image/png" sizes="16x16" href={`http://localhost:8090/ui/static/favicon/${page}-favicon.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`http://localhost:8090/ui/static/favicon/${page}-favicon.png`} />
    </Helmet>
  )
}

export default Head;