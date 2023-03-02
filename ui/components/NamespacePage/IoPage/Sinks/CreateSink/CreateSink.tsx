import React from 'react';

import { sinkConfigurations } from '../configurationsFields/configurationsFields';
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
      configurations={sinkConfigurations}
      updateIo={updateSink}
      ioType='sink'
    />
  )
}

export default CreateSink;