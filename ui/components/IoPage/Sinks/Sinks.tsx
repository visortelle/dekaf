import React from 'react';

import { routes } from '../../routes';
import Toolbar from '../../ui/Toolbar/Toolbar';

const Sinks = () => {

  return (
    <div>
    <Toolbar
      buttons={[
        {
          linkTo: routes.io.sinks.create._.get(),
          text: 'Sinks',
          onClick: () => { },
          type: 'primary',
          position: 'right'
        },
      ]}
    />
      A
    </div>
  )
}

export default Sinks;