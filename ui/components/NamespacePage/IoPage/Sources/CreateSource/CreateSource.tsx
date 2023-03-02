import React from 'react';

import { sourceConfigurations } from '../configurationsFields/configurationsFields';
import IoUpdate from '../../IoUpdate/IoUpdate';
import updateSink from '../../IoUpdate/updateSink';

type CreateSourceProps = {
  tenant: string,
  namespace: string,
}

const CreateSource = (props: CreateSourceProps) => {

  return (
    <IoUpdate
      action='create'
      tenant={props.tenant}
      namespace={props.namespace}
      configurations={sourceConfigurations}
      updateIo={updateSink}
      ioType='source'
    />
  )
}

export default CreateSource;