import React, { useState } from 'react';
import _ from 'lodash';
import * as Either from 'fp-ts/lib/Either';

import Checkbox from '../../../ui/Checkbox/Checkbox';
import CodeEditor from '../../../ui/CodeEditor/CodeEditor';
import MemorySizeInput from '../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import ListInput from '../../../ui/ConfigurationTable/ListInput/ListInput';
import KeyValueEditor from '../../../ui/KeyValueEditor/KeyValueEditor';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import ShortDurationInput from '../../../ui/ConfigurationTable/ShortDurationInput/ShortDurationInput';
import SchemaTypeInput from '../../../TopicPage/Schema/SchemaTypeInput/SchemaTypeInput';
import { SchemaTypeT } from '../../../TopicPage/Schema/types';
import { ConnectorsConfigs } from '../Sinks/configurationsFields/connectrosConfigs/configs';
import { Configurations, ConfigurationValue, InputsSpecs, PathToConnector, Resources, StringMap } from '../Sinks/configurationsFields/configurationsFields';

export type IoConfigFieldType = 'string' | 'json' | 'int' | 'boolean' | 'enum' | 'array' | 'map' | 'bytes' | 'duration' | 'attachments' | 'pathToConnector' | 'schemaType' | 'conditionalAttachments';

export type ConditionalAttachments = {
  limitation: 'sinkType',
  fields: {
    [key: string]: IoConfigField[],
  }
}

type Enum = {
  value: string,
  label: string,
}

export type IoConfigField = {
  name: string,
  isRequired: boolean,
  help: string | React.ReactNode,
  label: string,
  type: IoConfigFieldType,

  enum?: Enum[],
  mapType?: 'string' | IoConfigField[],
  attachments?: IoConfigField[],
  conditionalAttachments?: ConditionalAttachments,
}

export type IoConfigFieldProps = IoConfigField & {
  value: ConfigurationValue,
  onChange: (value: string[] | string | StringMap | PathToConnector | number | boolean) => void,
  configurations: Configurations
}

const IoConfigField = (props: IoConfigFieldProps) => {

  const [pathToConnectorType, setPathToConnectorType] = useState('url');
  // const connectors = ['aerospike', 'batch-data-generator', 'canal', 'cassandra', 'data-generator', 'debezium-mongodb', 'debezium-mssql', 'debezium-mysql', 'debezium-oracle', 'debezium-postgres', 'dynamodb', 'elastic-search', 'file', 'flume', 'hbase', 'hdfs2', 'hdfs3', 'http', 'influxdb', 'jdbc-clickhouse', 'jdbc-mariadb', 'jdbc-openmldb', 'jdbc-postgres', 'jdbc-sqlite', 'kafka', 'kafka-connect-adaptor', 'kinesis', 'mongo', 'netty', 'nsq', 'rabbitmq', 'redis', 'solr', 'twitter'];
  const connectors = ['aerospike', 'cassandra', 'elastic-search', 'flume', 'hbase', 'hdfs2', 'hdfs3', 'http', 'influxdb', 'jdbc-clickhouse', 'jdbc-mariadb', 'jdbc-openmldb', 'jdbc-postgres', 'jdbc-sqlite', 'kafka', 'mongo', 'rabbitmq', 'redis', 'solr'];

  const addToArray = (eArray: string) => {
    const newArray = _.cloneDeep(props.configurations[props.name] as string[]);
    newArray.push(eArray);
    props.onChange(newArray);
  }

  const removeFromArray = (eArray: string) => {
    const newArray = _.cloneDeep(props.configurations[props.name] as string[]);
    newArray.splice(newArray.indexOf(eArray), 1);
    props.onChange(newArray);
  }

  const validateArray = (v: string) => {
    const newArray = _.cloneDeep(props.configurations[props.name] as string[]);
    const index = newArray.indexOf(v);

    if (index !== -1) {
      return  Either.left(new Error('Elements must not be repeated'));
    } else {
      return Either.right(undefined);
    }
  }

  const isKeyValue = (data: StringMap | InputsSpecs | Resources | PathToConnector | ConnectorsConfigs): data is StringMap => {
    if (data.type || data.path) {
      return false;
    }
    return true;
  }

  const isSchemaType = (data: ConfigurationValue): data is SchemaTypeT => {

    if (props.type === 'schemaType') {
      return true;
    } else {
      return false;
    }
  }

  return (
    <>
      {props.type === 'enum' && props.enum && typeof(props.value) === 'string' && 
        <Select
          list={props.enum.map(subject => {
            return { type: 'item', value: subject.value, title: subject.label }
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
          <div className={sf.FormItem}>
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
          </div>

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
                    path:v,
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
        <ShortDurationInput
          initialValue={props.value / 1000}
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
        <ListInput<string>
          value={props.value}
          getId={(v) => v}
          renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
          editor={{
            render: (v, onChange) => <Input value={v} onChange={onChange} placeholder={`Enter new ${props.label.toLowerCase()}`} />,
            initialValue: '',
          }}
          onRemove={(v) => removeFromArray(v)}
          onAdd={(v) => addToArray(v)}
          validate={(v) => validateArray(v)}
        />
      }

      {props.type === 'map' && typeof(props.value) === 'object' && !Array.isArray(props.value) && isKeyValue(props.value) &&
        <KeyValueEditor
          value={props.value}
          onChange={(v) => props.onChange(v)}
        />
      }

      {props.type === 'schemaType' && isSchemaType(props.value) &&
        <SchemaTypeInput
          onChange={(v) => props.onChange(v)}
          value={props.value}
        />
      }
    </>
  )
}

export default IoConfigField;