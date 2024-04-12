import useSWR, {useSWRConfig} from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import {Code} from '../../../../grpc-web/google/rpc/code_pb';
import KeyValueEditor, {recordFromIndexedKv, recordToIndexedKv} from '../../../ui/KeyValueEditor/KeyValueEditor';
import {swrKeys} from '../../../swrKeys';
import {mapToObject} from '../../../../proto-utils/proto-utils';
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import {FC, useState} from "react";
import FormLabel from "../../../ui/ConfigurationTable/FormLabel/FormLabel";
import ActionButton from "../../../ui/ActionButton/ActionButton";
import {PulsarTopicPersistency} from "../../../pulsar/pulsar-resources";

const policy = 'topic-metadata';

export type SubscriptionPropertiesEditorProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
}

type Properties = {
  [key: string]: string
}

export const SubscriptionPropertiesEditor: FC<SubscriptionPropertiesEditorProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialProperties, error: initialPropertiesError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSubscriptionPropertiesRequest();
      req.setTopicFqn(topicFqn);
      req.setSubscriptionName(props.subscription);

      const res = await topicServiceClient.getSubscriptionProperties(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        throw new Error(`Unable to get subscription properties. ${res.getStatus()?.getMessage()}`);
      }

      return mapToObject(res.getPropertiesMap());
    }
  );

  if (initialPropertiesError) {
    notifyError(`Unable to get properties. ${initialPropertiesError}`);
  }

  if (initialProperties === undefined) {
    return null;
  }

  const onSave = async (properties: Properties) => {
    const req = new pb.SetSubscriptionPropertiesRequest();
    req.setTopicFqn(topicFqn);
    req.setSubscriptionName(props.subscription);

    Object.entries(properties).map(([key, value]) => {
      req.getPropertiesMap().set(key, value)
    })
    const res = await topicServiceClient.setSubscriptionProperties(req, null);

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to set subscription properties. ${res.getStatus()?.getMessage()}`);
    }

    await mutate(swrKey);
    setMode('view');
  }

  return (
    <WithUpdateConfirmation<Properties>
      key={stringify(initialProperties)}
      initialValue={initialProperties}
      onConfirm={onSave}
    >
      {({ value, onChange }) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4rem' }}>
            <FormLabel
              content="Properties"
              help={(
                <div>
                  Custom metadata associated with the subscription.
                  <br />
                  It serves as annotations or labels that provide additional information about the subscription. <br /> They are useful for organization, tracking, and automation tasks.
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

export default SubscriptionPropertiesEditor;
