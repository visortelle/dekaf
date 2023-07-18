import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import MemorySizeInput from '../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';

const policy = 'compactionThreshold';

type PolicyValue = { type: 'inherited-from-namespace-config' } | {
  type: 'specified-for-this-topic',
  sizeBytes: number;
} | {
  type: 'automatic-compaction-disabled'
};

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext()
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetCompactionThresholdRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);
      const res = await topicPoliciesServiceClient.getCompactionThreshold(req, {});
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      let value: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getThresholdCase()) {
        case pb.GetCompactionThresholdResponse.ThresholdCase.DISABLED: {
          value = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetCompactionThresholdResponse.ThresholdCase.ENABLED: {
          const threshold = res.getEnabled()?.getThreshold() || 0;
          value = threshold === 0 ? { type: 'automatic-compaction-disabled' } : { type: 'specified-for-this-topic', sizeBytes: threshold };
          break;
        }
      }

      return value;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get compaction threshold policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        switch (value.type) {
          case 'inherited-from-namespace-config': {
            const req = new pb.RemoveCompactionThresholdRequest();
            req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
            req.setIsGlobal(props.isGlobal);

            const res = await topicPoliciesServiceClient.removeCompactionThreshold(req, {});

            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
          case 'specified-for-this-topic': {
            const req = new pb.SetCompactionThresholdRequest();
            req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
            req.setIsGlobal(props.isGlobal);
            req.setThreshold(Math.floor(value.sizeBytes));

            const res = await topicPoliciesServiceClient.setCompactionThreshold(req, {});
            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
          case 'automatic-compaction-disabled': {
            const req = new pb.SetCompactionThresholdRequest();
            req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
            req.setIsGlobal(props.isGlobal);
            req.setThreshold(0);

            const res = await topicPoliciesServiceClient.setCompactionThreshold(req, {});
            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
        }
        setTimeout(async () => {
          await mutate(swrKey);
        }, 300);
      }}
    >
      {({ value, onChange }) => (
        <>
          <div className={sf.FormItem}>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', title: 'Inherited from namespace config', value: 'inherited-from-namespace-config' },
                { type: 'item', title: 'Automatic compaction disabled', value: 'automatic-compaction-disabled' },
                { type: 'item', title: 'Specified for this topic', value: 'specified-for-this-topic' },
              ]}
              value={value.type}
              onChange={(type) => {
                if (type === 'specified-for-this-topic') {
                  onChange({
                    type: 'specified-for-this-topic', sizeBytes: 1024
                  });
                  return;
                }

                onChange({ type });
              }}
            />
          </div>
          {value.type === 'specified-for-this-topic' && (
            <MemorySizeInput
              initialValue={value.sizeBytes}
              onChange={(size) => {
                if (size > 0) {
                  onChange({ ...value, sizeBytes: size })
                }
              }}
            />
          )}
        </>
      )}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Compaction threshold',
  description: <span>Set compactionThreshold for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
