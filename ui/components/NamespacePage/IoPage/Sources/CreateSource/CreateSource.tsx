import React from 'react';

import { sourceConfigurations } from '../configurationsFields/configurationsFields';
import IoUpdate from '../../IoUpdate/IoUpdate';
import updateSource from '../../IoUpdate/updateSource';

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
      updateIo={updateSource}
      ioType='source'
    />
  )
}

export default CreateSource;