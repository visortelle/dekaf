import React from 'react';
import _ from 'lodash';
import { configurations } from '../configurationsFields/configurationsFields';

import UpdateSink from '../UpdateSink/UpdateSink';

type CreateSinkProps = {
  tenant: string,
  namespace: string,
}

const CreateSink = (props: CreateSinkProps) => {

  return (
    <UpdateSink
      action='create'
      tenant={props.tenant}
      namespace={props.namespace}
      configurations={configurations}
    />
  )
}

export default CreateSink;