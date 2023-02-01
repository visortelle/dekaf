import React from 'react';

import Toolbar from '../ui/Toolbar/Toolbar';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import Sinks from './Sinks/Sinks';
import Sources from './Sources/Sources';
import CreateSinks from './Sinks/CreateSinks/CreateSinks';
import { routes } from '../routes';

import s from './IoPage.module.css'

export type IoPageView = 'sinks' | 'sinks-create' | 'sources' | 'sources-create';
export type IoPageProps = {
  view: IoPageView;
};

const IoPage: React.FC<IoPageProps> = (props) => {
  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop
        crumbs={[
          {
            id: `io`,
            value: 'Pulsar',
            type: 'link',
          },
        ]}
      />

      <div>
        <Toolbar
          buttons={[
            {
              linkTo: routes.io.sinks._.get(),
              text: 'Sinks',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.io.sources._.get(),
              text: 'Sources',
              onClick: () => { },
              type: 'regular'
            }
          ]}
        />
      </div>
      
      {props.view === 'sinks' && <Sinks />}
      {props.view === 'sinks-create' && <CreateSinks />}
      {props.view === 'sources' && <Sources />}
    </div>
  );
}

export default IoPage;
