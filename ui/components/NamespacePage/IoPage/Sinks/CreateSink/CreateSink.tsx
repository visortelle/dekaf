import React from 'react';
import _ from 'lodash';

import { configurations } from '../configurationsFields/configurationsFields';
import IoUpdate from '../../IoUpdate/IoUpdate';
import updateSink from '../../IoUpdate/updateSink';

type CreateSinkProps = {
  tenant: string,
  namespace: string,
}

const CreateSink = (props: CreateSinkProps) => {

  return (
    <IoUpdate
      action='create'
      tenant={props.tenant}
      namespace={props.namespace}
      configurations={configurations}
      updateIo={updateSink}
    />
    // <></>
  )
}

export default CreateSink;