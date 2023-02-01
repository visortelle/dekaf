import React from 'react';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';

import Checkbox from '../../ui/Checkbox/Checkbox';
import CodeEditor from '../../ui/CodeEditor/CodeEditor';
import DurationInput from '../../ui/ConfigurationTable/DurationInput/DurationInput';
import MemorySizeInput from '../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import Input from '../../ui/Input/Input';
import Select from '../../ui/Select/Select';
import { Configurations, StringMap, StringMapItem } from '../Sinks/configurationsFields';

export type IoConfigFieldType = 'string' | 'json' | 'int' | 'boolean' | 'enum' | 'array' | 'map' | 'bytes' | 'duration' | 'attachments';

export type IoConfigField = {
  name: string,
  isRequired: boolean,
  help: string | React.ReactNode,
  type: IoConfigFieldType,

  enum?: string[],
  mapType?: 'string' | IoConfigField[],
  attachments?: IoConfigField[],
}

export type IoConfigFieldProps = IoConfigField & {
  value: keyof Configurations | StringMap,
  onChange: (value: string[] | string | StringMap | number | boolean) => void,
  configurations: Configurations,
}

const IoConfigField = (props: IoConfigFieldProps) => {

  const expandArray = () => {
    let expandedArray: string[] = [...props.configurations[props.name] as string[], ''];
    props.onChange(expandedArray);
  }

  const changeArray = (eArray: string, index: number) => {
    const newArray = _.cloneDeep(props.configurations[props.name] as string[]);
    newArray[index] = eArray;
    props.onChange(newArray);
  }

  const expandMap = () => {
    if (
        props.name === 'topicToSerdeClassName' ||
        props.name === 'topicToSchemaType' ||
        props.name === 'topicToSchemaProperties' ||
        props.name === 'schemaProperties' ||
        props.name === 'consumerProperties'
    ) {

      let expandedMap = {
        ...props.configurations[props.name] as StringMap,
        [uuid()]: {
          name: '',
          value: ''
        }
      }

      props.onChange(expandedMap);
    }
  }

  const changeMap = (eMap: string, property: 'name' | 'value',  key: string) => {
    const newMap = _.cloneDeep(props.configurations[props.name] as StringMap);
    newMap[key][property] = eMap;
    props.onChange(newMap);
  }

  return (
    <div>
      {props.type === 'enum' && props.enum && typeof(props.value) === 'string' && 
        <Select
          list={props.enum.map(subject => {
            return { type: 'item', value: subject, title: subject }
          })}
          value={props.value}
          onChange={(v) => props.onChange(v)}
        />
      }

      {props.type === 'string' && typeof(props.value) === 'string' &&
        <Input
          type='text'
          value={props.value}
          onChange={(v) => props.onChange(v)}
        />
      }

      {props.type === 'int' && typeof(props.value) === 'number' &&
        <Input
          type='number'
          value={props.value.toString()}
          onChange={(v) => props.onChange(Number(v))}
        />
      }

      {props.type === 'boolean' && typeof(props.value) === 'boolean' &&
        <Checkbox
          checked={props.value}
          onChange={(v) => props.onChange(v)}
        />
      }

      {props.type === 'duration' && typeof(props.value) === 'number' &&
        <DurationInput
          initialValue={props.value}
          onChange={(v) => props.onChange(v)}
        />
      }

      {props.type === 'bytes' && typeof(props.value) === 'number' &&
        <MemorySizeInput
          initialValue={props.value}
          onChange={(v) => props.onChange(v)}
        />
      }

      {props.type === 'json' && typeof(props.value) === 'string' &&
        <CodeEditor
          value={props.value}
          onChange={(v) => props.onChange(v || '')}
          height="180rem"
          language="json"
        />
      }

      {props.type === 'array' && Array.isArray(props.value) &&
        <div>
          <div onClick={() => expandArray()}>
            +array
          </div>

          {props.value.map((value, index) => (
            <Input
              key={index}
              type='text'
              value={value}
              onChange={(v) => changeArray(v, index)}
            />
          ))}
        </div>
      }

      {props.type === 'map' &&
        <div>
          <div onClick={() => expandMap()}>
            +map
          </div>
          {Object.keys(props.value).map((key) => (
            <div key={key}>
              <Input
                value={props.value[key as keyof StringMap].name}
                onChange={(v) => changeMap(v, 'name', key)}
                type='text'
              />
              <Input
                value={props.value[key].value}
                onChange={(v) => changeMap(v, 'value', key)}
                type='text'
              />
            </div>
          ))}
        </div>
      }

    </div>
  )
}

export default IoConfigField;