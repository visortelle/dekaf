import React from 'react';
import s from './BasicMessageFilterTargetInput.module.css'
import { BasicMessageFilterTarget } from '../../../../../basic-message-filter-types';
import Select from '../../../../../../Select/Select';
import BasicMessageFilterValueTargetInput from './BasicMessageFilterValueTargetInput/BasicMessageFilterValueTargetInput';

export type BasicMessageFilterTargetInputProps = {
  value: BasicMessageFilterTarget,
  onChange: (v: BasicMessageFilterTarget) => void,
  isReadOnly?: boolean
};

type TargetType = BasicMessageFilterTarget['target']['type'];

const BasicMessageFilterTargetInput: React.FC<BasicMessageFilterTargetInputProps> = (props) => {
  let flexDirection: 'row' | 'column' = 'row';
  if (props.value.target.type === "BasicMessageFilterValueTarget" && props.value.target.jsonFieldSelector !== undefined) {
    flexDirection = 'column';
  }

  return (
    <div className={s.BasicMessageFilterTargetInput} style={{ flexDirection }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '12rem' }}>
          <strong style={{ whiteSpace: 'nowrap' }}>messages where</strong>&nbsp;
          {props.value.target.type === "BasicMessageFilterValueTarget" && props.value.target.jsonFieldSelector === undefined && (
            <span>
              <strong
                style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}
                onClick={() => {
                  if (props.isReadOnly) {
                    return;
                  }

                  if (props.value.target.type === "BasicMessageFilterValueTarget") {
                    const newValue: BasicMessageFilterTarget = {
                      ...props.value,
                      target: {
                        ...props.value.target,
                        jsonFieldSelector: ''
                      }
                    };
                    props.onChange(newValue);
                  }
                }}
              >entire</strong>&nbsp;
            </span>
          )}
        </span>

        <div className={s.TargetType}>
          <Select<TargetType>
            size='small'
            list={[
              { type: 'item', title: 'value', value: 'BasicMessageFilterValueTarget' },
              { type: 'item', title: 'key', value: 'BasicMessageFilterKeyTarget' },
              { type: 'item', title: 'property', value: 'BasicMessageFilterPropertyTarget' },
              { type: 'item', title: 'state', value: 'BasicMessageFilterSessionContextStateTarget' }
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
            isReadOnly={props.isReadOnly}
          />
        </div>
      </div>

      <div className={s.Target}>
        {props.value.target.type === "BasicMessageFilterValueTarget" && props.value.target.jsonFieldSelector !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', flex: '1', paddingLeft: '48rem', marginTop: '8rem' }}>
            <strong
              style={{ textDecoration: 'underline dotted', cursor: 'pointer', fontSize: '12rem' }}
              onClick={() => {
                if (props.isReadOnly) {
                  return;
                }

                if (props.value.target.type === "BasicMessageFilterValueTarget") {
                  const newValue: BasicMessageFilterTarget = {
                    ...props.value,
                    target: {
                      ...props.value.target,
                      jsonFieldSelector: undefined
                    }
                  };
                  props.onChange(newValue);
                }
              }}
            >sub field</strong>&nbsp;
            <BasicMessageFilterValueTargetInput
              value={props.value.target}
              onChange={(v) => props.onChange({ ...props.value, target: v })}
              isReadOnly={props.isReadOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default BasicMessageFilterTargetInput;
