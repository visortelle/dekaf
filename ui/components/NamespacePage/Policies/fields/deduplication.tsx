import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import React from "react";
import TooltipElement from "../../../ui/Tooltip/TooltipLink/TooltipElement";

const policy = 'deduplication';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = 'inherited-from-broker-config' | 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDeduplicationRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await adminClient.namespaceServiceClient.getDeduplication(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get deduplication policy. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = 'inherited-from-broker-config';
      switch (res.getDeduplicationCase()) {
        case pb.GetDeduplicationResponse.DeduplicationCase.UNSPECIFIED: initialValue = 'inherited-from-broker-config'; break;
        case pb.GetDeduplicationResponse.DeduplicationCase.SPECIFIED: {
          initialValue = res.getSpecified()?.getEnabled() ? 'enabled' : 'disabled';
          break;
        }
      }

      return initialValue;
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
        if (v === 'inherited-from-broker-config') {
          const req = new pb.RemoveDeduplicationRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await adminClient.namespaceServiceClient.removeDeduplication(req, {})
            .catch(err => notifyError(`Unable to set deduplication policy: ${err}`));

          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        if (v === 'enabled' || v === 'disabled') {
          const req = new pb.SetDeduplicationRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setEnabled(v === 'enabled');

          const res = await adminClient.namespaceServiceClient.setDeduplication(req, {})
            .catch(err => notifyError(`Unable to set deduplication policy: ${err}`));

          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={[
              { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
              { type: 'item', value: 'enabled', title: 'Enabled' },
              { type: 'item', value: 'disabled', title: 'Disabled' },
            ]}
            value={value}
            onChange={(v) => onChange(v)}
          />
        );
      }}
    </WithUpdateConfirmation>
  );
}

type TermKey =
  'deduplication';

const help: Record<TermKey, React.ReactNode> = {
  'deduplication': <div>Feature that ensures each message produced on Pulsar topics is stored only once, even if the message is produced multiple times. Also enabling of message deduplication could affect the performance of the brokers during informational snapshots.</div>
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Deduplication',
  description: <span>Enables or disable <TooltipElement tooltipHelp={help["deduplication"]} link="https://pulsar.apache.org/docs/next/cookbooks-deduplication/">deduplication</TooltipElement> for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
