import useSWR, { useSWRConfig } from "swr";

import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Input from "../../../ui/ConfigurationTable/Input/Input";
import Select from '../../../ui/Select/Select';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';

const policy = 'autoTopicCreation';

type TopicType = 'partitioned' | 'non-partitioned';
export type PolicyValue = { type: 'inherited-from-broker-config' } | {
  type: 'specified',
  isAllowAutoTopicCreation: boolean;
  defaultNumPartitions: number;
  topicType: TopicType;
}

type IsAllowAutoTopicCreation = 'true' | 'false'

export type FieldInputProps = {
  tenant: string;
  namespace: string;
};

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const defaultNumPartitions = 4;

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetAutoTopicCreationRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getAutoTopicCreation(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get auto topic creation policy. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let v: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getAutoTopicCreation()) {
        case pb.AutoTopicCreation.AUTO_TOPIC_CREATION_SPECIFIED: {
          const autoTopicCreationOverride = res.getAutoTopicCreationOverride();
          if (autoTopicCreationOverride === undefined) {
            break;
          }

          let topicType: TopicType = 'non-partitioned';
          switch (autoTopicCreationOverride.getTopicType()) {
            case pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_PARTITIONED: topicType = 'partitioned';
            break;
            case pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_NON_PARTITIONED: topicType = 'non-partitioned';
            break;
          }

          v = {
            type: 'specified',
            isAllowAutoTopicCreation: autoTopicCreationOverride.getIsAllowTopicCreation(),
            defaultNumPartitions: autoTopicCreationOverride.getDefaultNumPartitions() || defaultNumPartitions,
            topicType
          }
        }; break;
      };

      return v;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get deduplication: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }
  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (v) => {

        if (v.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveAutoTopicCreationRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          const res = await namespaceServiceClient.removeAutoTopicCreation(req, {}).catch(err => notifyError(`Unable to set auto topic creation policy. ${err}`));
          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set auto topic creation policy. ${res?.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (v.type === 'specified') {
          const req = new pb.SetAutoTopicCreationRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setAutoTopicCreation(pb.AutoTopicCreation.AUTO_TOPIC_CREATION_SPECIFIED);

          const autoTopicCreationOverride = new pb.AutoTopicCreationOverride();
          autoTopicCreationOverride.setIsAllowTopicCreation(v.isAllowAutoTopicCreation);
          
          if (v.topicType === 'partitioned') {
            autoTopicCreationOverride.setDefaultNumPartitions(v.defaultNumPartitions);
          }

          switch (v.topicType) {
            case 'partitioned': autoTopicCreationOverride.setTopicType(pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_PARTITIONED); break;
            case 'non-partitioned': autoTopicCreationOverride.setTopicType(pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_NON_PARTITIONED); break;
          }
          req.setAutoTopicCreationOverride(autoTopicCreationOverride);

          const res = await namespaceServiceClient.setAutoTopicCreation(req, {}).catch(err => notifyError(`Unable to set auto topic creation policy. ${err}`));
          if (res === undefined) {
            return;
          }
          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set auto topic creation policy. ${res?.getStatus()?.getMessage()}`);
            return;
          }
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                onChange={(v) => {
                  if (v === 'inherited-from-broker-config') {
                    onChange({ 'type': 'inherited-from-broker-config' });
                  }
                  if (v === 'specified') {
                    onChange({
                      type: 'specified',
                      isAllowAutoTopicCreation: false,
                      defaultNumPartitions: 4,
                      topicType: 'non-partitioned'
                    });
                  }
                }}
                value={value.type}
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'specified', title: 'Specified for this namespace' }
                ]}
              />
            </div>

            {value.type === 'specified' && (
              <div>
                <div className={sf.FormItem}>
                  <strong className={sf.FormLabel}>Allow</strong>
                  <Select<IsAllowAutoTopicCreation>
                    onChange={(v) => onChange({ ...value, isAllowAutoTopicCreation: v == 'true', defaultNumPartitions: defaultNumPartitions})}
                    value={`${value.isAllowAutoTopicCreation}`}
                    list={[ { type: 'item', value: 'false', title: 'Disallowed' }, { type: 'item', value: 'true', title: 'Allowed' } ]}
                  />
                </div>
              </div>
            )}

            {value.type === 'specified' && value.isAllowAutoTopicCreation === true && (
              <div className={sf.FormItem}>
                <strong className={sf.FormLabel}>Topic type</strong>
                <Select<TopicType>
                  onChange={(v) => onChange({ ...value, topicType: v, defaultNumPartitions: defaultNumPartitions })}
                  value={value.topicType}
                  list={[{ type: 'item', value: 'non-partitioned', title: 'Non-partitioned' }, { type: 'item', value: 'partitioned', title: 'Partitioned' }]}
                />
              </div>
            )}

            {value.type === 'specified' && value.isAllowAutoTopicCreation === true && value.topicType === 'partitioned' && (
              <div className={sf.FormItem}>
                <strong className={sf.FormLabel}>Num partitions</strong>
                <Input
                  type='number'
                  onChange={(v) => {
                    const int = parseInt(v, 10);
                    const defaultNumPartitions = int < 1 ? 1 : int;

                    onChange({ ...value, defaultNumPartitions });
                  }}
                  value={String(value.defaultNumPartitions)}
                  inputProps={{ min: 1 }}
                />
              </div>
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Auto topic creation',
  description: <span>Enable or disable auto topic creation for this namespace, overriding broker settings.</span>,
  input: <FieldInput {...props} />
});

export default field;
