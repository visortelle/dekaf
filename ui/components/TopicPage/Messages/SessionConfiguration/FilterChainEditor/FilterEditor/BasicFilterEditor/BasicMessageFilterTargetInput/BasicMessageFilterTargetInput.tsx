import React from 'react';
import s from './BasicMessageFilterTargetInput.module.css'
import { BasicMessageFilterTarget } from '../../../../../basic-message-filter-types';
import Select from '../../../../../../../ui/Select/Select';
import { BasicMessageFilterValueTarget } from '../../../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import BasicMessageFilterValueTargetInput from './BasicMessageFilterValueTargetInput/BasicMessageFilterValueTargetInput';
import FormItem from '../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type BasicMessageFilterTargetInputProps = {
  value: BasicMessageFilterTarget,
  onChange: (v: BasicMessageFilterTarget) => void
};

type TargetType = BasicMessageFilterTarget['target']['type'];

const BasicMessageFilterTargetInput: React.FC<BasicMessageFilterTargetInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterTargetInput}>
      <div style={{ flex: '0 1 110rem' }}>
        <Select<TargetType>
          list={[
            { type: 'item', title: 'Value', value: 'BasicMessageFilterValueTarget' },
            { type: 'item', title: 'Key', value: 'BasicMessageFilterKeyTarget' },
            { type: 'item', title: 'Property', value: 'BasicMessageFilterPropertyTarget' },
            { type: 'item', title: 'State', value: 'BasicMessageFilterSessionContextStateTarget' }
          ]}
          value={props.value.target.type}
          onChange={v => {
            switch (v) {
              case "BasicMessageFilterKeyTarget":
                props.onChange({ ...props.value, target: { type: "BasicMessageFilterKeyTarget", jsonFieldSelector: "" } });
                break;
              case "BasicMessageFilterValueTarget":
                props.onChange({ ...props.value, target: { type: "BasicMessageFilterValueTarget", jsonFieldSelector: "" } });
                break;
              case "BasicMessageFilterPropertyTarget":
                props.onChange({ ...props.value, target: { type: "BasicMessageFilterPropertyTarget", propertyKey: "" } });
                break;
              case "BasicMessageFilterSessionContextStateTarget":
                props.onChange({ ...props.value, target: { type: "BasicMessageFilterSessionContextStateTarget", jsonFieldSelector: "" } });
                break;
            }
          }}
        />
      </div>

      <div style={{ flex: 1 }}>
        {props.value.target.type === "BasicMessageFilterValueTarget" && (
          <BasicMessageFilterValueTargetInput
            value={props.value.target}
            onChange={(v) => props.onChange({ ...props.value, target: v })}
          />
        )}
      </div>
    </div>
  );
}

export default BasicMessageFilterTargetInput;
