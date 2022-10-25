import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/ConfigurationTable/Input/Input';
import ListInput from '../../../ui/ConfigurationTable/ListInput/ListInput';
import * as Either from 'fp-ts/Either';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { swrKeys } from '../../../swrKeys';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import Select from '../../../ui/Select/Select';
import { uniq } from 'lodash';

const policy = 'bookieAffinityGroup';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = { type: 'not-specified' } | {
  type: 'specified';
  primary: string[];
  secondary: string[];
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetBookieAffinityGroupRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getBookieAffinityGroup(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        throw new Error(`Unable to get bookie affinity group. ${res.getStatus()?.getMessage()}`);
      }

      const bookieAffinityGroupData: PolicyValue = res.getGroupData() ? {
        type: 'specified',
        primary: res.getGroupData()?.getPrimaryList().filter(g => g !== '') || [],
        secondary: res.getGroupData()?.getSecondaryList().filter(g => g !== '') || [],
      } : { type: 'not-specified' };

      return bookieAffinityGroupData;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get bookie affinity group. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'not-specified') {
          const req = new pb.RemoveBookieAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          const res = await namespaceServiceClient.removeBookieAffinityGroup(req, {}).catch((err) => notifyError(`Unable to disable bookie affinity group policy. ${err}`));
          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to disable bookie affinity group policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified') {
          const req = new pb.SetBookieAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          const groupDataPb = new pb.BookieAffinityGroupData();
          groupDataPb.setPrimaryList(value.primary);
          groupDataPb.setSecondaryList(value.secondary);
          req.setGroupData(groupDataPb);

          const res = await namespaceServiceClient.setBookieAffinityGroup(req, {}).catch((err) => notifyError(`Unable to set bookie affinity group policy. ${err}`));
          if (res === undefined) {
            return;
          }
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to update bookie affinity group policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        await mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
                onChange={(v) => onChange(v === 'specified' ? { type: 'specified', primary: [], secondary: [] } : { type: 'not-specified' })}
                value={value.type}
              />
            </div>

            {value.type === 'specified' && (
              <div className={sf.FormItem}>
                <strong className={sf.FormLabel}>Primary groups</strong>

                <ListInput<string>
                  value={value.primary}
                  getId={(v) => v}
                  renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
                  editor={{
                    render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="Enter group name" />,
                    initialValue: '',
                  }}
                  onRemove={async (roleId) => {
                    if (value.type !== 'specified') {
                      return;
                    }

                    onChange({ ...value, primary: value.primary.filter((v) => v !== roleId) });
                  }}
                  onAdd={async (v) => {
                    if (value.type !== 'specified') {
                      return;
                    }

                    onChange({ ...value, primary: uniq([...value.primary, v]) });
                  }}
                  validate={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Group name is required'))}
                />
              </div>
            )}

            {value.type === 'specified' && (
              <div className={sf.FormItem}>
                <strong className={sf.FormLabel}>Secondary groups</strong>
                <ListInput<string>
                  value={value.secondary}
                  getId={(v) => v}
                  renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
                  editor={{
                    render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="Enter group name" />,
                    initialValue: '',
                  }}
                  onRemove={async (roleId) => {
                    if (value.type !== 'specified') {
                      return;
                    }

                    onChange({ ...value, secondary: value.secondary.filter((v) => v !== roleId) });
                  }}
                  onAdd={async (v) => {
                    if (value.type !== 'specified') {
                      return;
                    }

                    onChange({ ...value, secondary: uniq([...value.secondary, v]) });
                  }}
                  validate={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Group name is required'))}
                />
              </div>
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Bookie affinity group',
  description: <span>Bookie affinity group name for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
