import React, { useState } from 'react';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';

import Checkbox from '../../ui/Checkbox/Checkbox';
import CodeEditor from '../../ui/CodeEditor/CodeEditor';
import DurationInput from '../../ui/ConfigurationTable/DurationInput/DurationInput';
import MemorySizeInput from '../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import Input from '../../ui/Input/Input';
import Select from '../../ui/Select/Select';
import { Configurations, ConfigurationValue, PathToConnector, StringMap } from '../Sinks/configurationsFields';

export type IoConfigFieldType = 'string' | 'json' | 'int' | 'boolean' | 'enum' | 'array' | 'map' | 'bytes' | 'duration' | 'attachments' | 'pathToConnector';

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
  value: ConfigurationValue,
  // value: any,
  // onChange: (value: string[] | string | StringMap | number | boolean) => void,
  onChange: (value: string[] | string | StringMap | PathToConnector | number | boolean) => void,
  // onChange: (value: any) => void,
  configurations: Configurations
}

const IoConfigField = (props: IoConfigFieldProps) => {

  const [pathToConnectorType, setPathToConnectorType] = useState('url');
  const connectors = ['aerospike', 'batch-data-generator', 'canal', 'cassandra', 'data-generator', 'debezium-mongodb', 'debezium-mssql', 'debezium-mysql', 'debezium-oracle', 'debezium-postgres', 'dynamodb', 'elastic-search', 'file', 'flume', 'hbase', 'hdfs2', 'hdfs3', 'http', 'influxdb', 'jdbc-clickhouse', 'jdbc-mariadb', 'jdbc-openmldb', 'jdbc-postgres', 'jdbc-sqlite', 'kafka', 'kafka-connect-adaptor', 'kinesis', 'mongo', 'netty', 'nsq', 'rabbitmq', 'redis', 'solr', 'twitter'];

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

      {props.type === 'pathToConnector' && typeof(props.value) === 'object' && !Array.isArray(props.value) && typeof(props.value.type) === 'string' && typeof(props.value.path) === 'string' &&
        <div>
          <Select
            list={[
              { type: 'item', value: 'url', title: 'url' },
              { type: 'item', value: 'folder', title: 'folder' },
            ]}
            value={props.value.type}
            onChange={(v) => {
              setPathToConnectorType(v)
              typeof(props.value) === 'object' && !Array.isArray(props.value) && typeof(props.value.type) === 'string' && typeof(props.value.path) === 'string' &&
                props.onChange({ path: props.value.path, type: v })
            }}
          />
          {pathToConnectorType === 'url' &&
            <Select
              list={connectors.map(subject => {
                return { type: 'item', value: subject, title: subject }
              })}
              value={props.value.path}
              onChange={(v) => {
                typeof(props.value) === 'object' && !Array.isArray(props.value) && typeof(props.value.type) === 'string' && typeof(props.value.path) === 'string' &&
                  props.onChange({
                    type: props.value.type,
                    path:`https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-${v}-2.11.0.nar`
                  })
              }}
            />
          }
          {pathToConnectorType === 'folder' &&
            <Input
              type='text'
              value={props.value.path}
              onChange={(v) => {
                typeof(props.value) === 'object' && !Array.isArray(props.value) && typeof(props.value.type) === 'string' && typeof(props.value.path) === 'string' &&
                  props.onChange({ type: props.value.type, path: v})
              }}
            />
          }
        </div>
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
          {Object.keys(props.value).map((key) => {
            if (
              typeof(props.value) === 'object' &&
              !Array.isArray(props.value) &&
              typeof(props.value[key]) !== 'number'
            ) {
              const keyReference = props.value[key]

              if (typeof(keyReference) !== 'number' && typeof(keyReference) !== 'string' && typeof(keyReference.value) === 'string'){
                return (
                  <div key={key}>
                    <Input
                      value={keyReference.name}
                      onChange={(v) => changeMap(v, 'name', key)}
                      type='text'
                    />
                    <Input
                      value={keyReference.value}
                      onChange={(v) => changeMap(v, 'value', key)}
                      type='text'
                    />
                  </div>
                )
              }
            }
          })}
        </div>
      }

    </div>
  )
}

export default IoConfigField;