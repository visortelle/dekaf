import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../../app/contexts/Notifications';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import KeyValueEditor, { recordFromIndexedKv, recordToIndexedKv } from '../../../../ui/KeyValueEditor/KeyValueEditor';
import { swrKeys } from '../../../../swrKeys';
import { mapToObject } from '../../../../../proto-utils/proto-utils';
import WithUpdateConfirmation from "../../.././../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { FC, useState } from "react";
import FormLabel from "../../../../ui/ConfigurationTable/FormLabel/FormLabel";
import ActionButton from "../../../../ui/ActionButton/ActionButton";

const policy = 'properties';

export type NamespacePropertiesEditorProps = {
  tenant: string;
  namespace: string;
}

type Properties = {
  [key: string]: string
}

export const NamespacePropertiesEditor: FC<NamespacePropertiesEditorProps> = (props) => {
  const { namespaceServiceClient } = GrpcClient.useContext();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPropertiesRequest();
      req.setNamespacesList([`${props.tenant}/${props.namespace}`]);

      const res = await namespaceServiceClient.getProperties(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        throw new Error(`Unable to get properties. ${res.getStatus()?.getMessage()}`);
      }

      const propertiesPb = mapToObject(res.getPropertiesMap())[`${props.tenant}/${props.namespace}`];
      const properties = mapToObject(propertiesPb.getPropertiesMap());

      return properties;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get properties. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const onSave = async (properties: Properties) => {
    const req = new pb.SetPropertiesRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);

    Object.entries(properties).map(([key, value]) => {
      req.getPropertiesMap().set(key, value)
    })
    const res = await namespaceServiceClient.setProperties(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to set properties. ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
    setMode('view');
  }

  return (
    <WithUpdateConfirmation<Properties>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={onSave}
    >
      {({ value, onChange }) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4rem' }}>
            <FormLabel
              content="Properties"
              help={(
                <div>
                  Custom metadata associated with a namespace.
                  <br />
                  They serve as annotations or labels that provide additional information about the namespace, such as its environment, owner, or any other metadata. <br /> They are useful for organization, tracking, and potential automation tasks.
                </div>
              )}
            />
            {mode === 'view' && <ActionButton action={{ type: 'predefined', action: 'edit'}} onClick={() => setMode('edit')} title="Edit" />}
            {mode === 'edit' && <ActionButton action={{ type: 'predefined', action: 'view'}} onClick={() => setMode('view')} title="View" />}
          </div>

          <KeyValueEditor
            value={recordToIndexedKv(value)}
            onChange={v => onChange(recordFromIndexedKv(v))}
            height="300rem"
            testId="properties"
            mode={mode === 'view' ? 'readonly' : 'edit'}
          />
        </div>
      )}
    </WithUpdateConfirmation>
  )
}

export default NamespacePropertiesEditor;
