import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import { useNavigate } from 'react-router-dom';

import * as Modals from '../../../app/contexts/Modals/Modals';
import Button from '../../../ui/Button/Button';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../ui/ConfigurationTable/FormItem/FormItem';
import { H1 } from '../../../ui/H/H';
import IoConfigField, { Attachment } from '../IoConfigField/IoConfigField';
import { sinkConfigurationsFields, StringMap, PathToConnector, SinkConfigurations, SinkConfigurationValue, sinkConfigurations, InputsSpecs, Resources } from '../Sinks/configurationsFields/configurationsFields';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { SourceConfigurations, SourceConfigurationValue, sourceConfigurationsFields, sourceConfigurations, BatchSourceConfig, ProducerConfig } from '../Sources/configurationsFields/configurationsFields';
import { ElasticSearchSslConfigs } from '../Sinks/configurationsFields/connectrosConfigs/connectors/elasticsearchConfigs';
import { SinkConnectorsConfigs } from '../Sinks/configurationsFields/connectrosConfigs/configs';
import { SourceConnectorsConfigs } from '../Sources/configurationsFields/connectrosConfigs/configs';
import AttachmentsFields from './AttachmentsFields/AttachmentsFields';

import deleteIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/delete.svg';
import enableIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';

import s from './IoUpdate.module.css';
import sl from '../../../ui/ConfigurationTable/ListInput/ListInput.module.css';
type IoProps = {
  tenant: string,
  namespace: string,
  action: 'edit' | 'create',
  configurations: SinkConfigurations | SourceConfigurations,
}

type IoUpdateProps = IoProps & {
  ioType: 'sink' | 'source',
  updateIo: (props: IoProps) => Promise<void>,
}

const IoUpdate = (props: IoUpdateProps) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const [configurations, setConfigurations] = useState(props.configurations);
  const [hideUnrequired, setHideUnrequired] = useState(true);

  const configurationsFields = props.ioType === 'sink' ? sinkConfigurationsFields : sourceConfigurationsFields;
  const defaultConfigurations = props.ioType === 'sink' ? sinkConfigurations : sourceConfigurations;

  const isConnectorsConfigs = (value: SinkConfigurationValue | SourceConfigurationValue): value is SinkConnectorsConfigs | SourceConnectorsConfigs => {
    if (typeof(value) === 'object' && !Array.isArray(value) && value.hasOwnProperty('flume')) {
      return true;
    }
    return false;
  }

  const isElasticSearchSslConfigs = (value: boolean | string[] | StringMap | Date | ElasticSearchSslConfigs | ((string | number) & (string | number | boolean | StringMap | Date))): value is ElasticSearchSslConfigs => {
    if (typeof(value) === 'object') {
      return true;
    }
    return false;
  }

  const isComplexString = (configurationValue: SinkConfigurationValue | SourceConfigurationValue): configurationValue is string | string[] => {
    if (typeof(configurationValue) !== 'number' && typeof(configurationValue) !== 'boolean' && ((typeof(configurationValue) === 'object' && Array.isArray(configurationValue)) || typeof(configurationValue) === 'string' || Array.isArray(configurationValue))) {
      return true;
    }
    
    return false;
  }

  const isPathToConnector = (configurationValue: SinkConfigurationValue | SourceConfigurationValue): configurationValue is PathToConnector => {
    if (typeof(configurationValue) !== 'object' || Array.isArray(configurationValue)) {
      return false;
    }

    return configurationValue.hasOwnProperty('path') ? true : false;
  }

  const isInputSpecs = (configurationValue: string | number | boolean | string[] | StringMap | InputsSpecs | Resources | PathToConnector | SinkConnectorsConfigs | BatchSourceConfig | ProducerConfig | SourceConnectorsConfigs | Date): configurationValue is InputsSpecs => {
    return true
  }

  const onChange = (configurations: SinkConfigurations | SourceConfigurations) => {
    setConfigurations(configurations);
  }

  const expandMap = (key: string) => {
    const newMap =  _.cloneDeep(configurations);
    const newMapKey = newMap[key];
    const defaultData = defaultConfigurations[key]
    if (defaultData && isInputSpecs(defaultData) && isInputSpecs(newMapKey)) {
      const defaultDataObject = defaultData;
      if (isInputSpecs(defaultDataObject) && typeof newMapKey === 'object' && !Array.isArray(newMapKey)) {
        newMap[key] = {
          ...newMapKey,
          [uuid()]: defaultDataObject.default
        };
      }
    }
    setConfigurations(newMap);
  }

  const reduceMap = (key: string, index: string) => {
    let newMap =  _.cloneDeep(configurations);
    const removableKey = newMap[key];
    if (typeof removableKey === 'object' && !Array.isArray(removableKey) && !(removableKey instanceof Date)) {
      delete removableKey[index];
      setConfigurations(newMap);
    }
  }

  const changeAttachment = (configurationName: string,  value: string | number | boolean | string[] | StringMap | PathToConnector | Attachment, condition?: string) => {
    const newAttachment = _.cloneDeep(configurations);
    
    if (condition) {
      const x = newAttachment[configurationName]

      if (typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date)) {
        x[condition] = value;
      }

    } else {
      newAttachment[configurationName] = value;
    }

    onChange(newAttachment);
  }

  const changeMap = (configurationName: string, configurationKey: string, value: Attachment) => {

    const newMap = _.cloneDeep(configurations);
    const x = newMap[configurationName];

    if (typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date)) {
      x[configurationKey] = value;
      
      setConfigurations(newMap);
    }
  }

  // const changeConditionalAttachments = (configurationName: string, attachmentName: string, field: string, value: string | number | boolean | string[] | StringMap, nestedName?: string) => {
  //   const newAttachment = _.cloneDeep(configurations);

  //   if (configurationName === 'configs' && !Array.isArray(value)) {
  //     let attachment = newAttachment[configurationName][field][attachmentName];
  //     if (nestedName && isElasticSearchSslConfigs(attachment) && (typeof(value) === 'string' || typeof(value) === 'boolean')) {
  //       attachment[nestedName] = value;
  //     } else {
  //       attachment = value;
  //     }
  //     newAttachment[configurationName][field][attachmentName] = attachment;
  //     onChange(newAttachment);
  //   }
  // }

  return (
    <div className={`${s.UpdateSink}`}>
      <div className={s.Title}>
        <H1>
          {props.action === 'create' && `Create ${props.ioType}`}

          {props.action === 'edit' && 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {`Update ${props.ioType}`}
              <Button
                buttonProps={{ type: 'submit' }}
                text='Delete'
                type='danger'
                onClick={() => modals.push({
                  id: 'delete-resource-group',
                  title: `Delete resource group`,
                  content: 
                    <DeleteDialog
                      tenant={props.tenant}
                      namespace={props.namespace}
                      sink={props.configurations.name}
                      navigate={navigate}
                    />,
                  styleMode: 'no-content-padding'
                })}
              />
            </div>
          }
        </H1>
      </div>

      {configurationsFields.map(configuration => (
        <FormItem key={configuration.name}>
          <div key={configuration.name} className={`${s.Field} ${(hideUnrequired && !configuration.isRequired) && s.HideUnrequired}`}>
            {(props.action === 'edit' && configuration.name !== 'pathToConnector' || props.action === 'create') &&
              <>
                <div className={s.Label}>
                  <FormLabel
                    content={configuration.label}
                    isRequired={configuration.isRequired}
                  />
                  <div className={s.EntryButton}>
                    <Button
                      svgIcon={enableIcon}
                      onClick={() => {}}
                      title='help information'
                      type='primary'
                    />
                    <span className={`${s.HelpInformation}`}>
                      {configuration.help}
                    </span>
                  </div>
                </div>

                {configuration.attachments &&
                  <div className={s.MapObject}>
                    <AttachmentsFields
                      configurations={configurations[configuration.name]}
                      attachment={configuration.attachments}
                      attachmentName={configuration.name}
                      onChange={(v) => changeAttachment(configuration.name, v)}
                    />
                  </div>
                }
                
                {!configuration.attachments && (configuration.type !== 'map' || typeof(configuration.mapType) === 'string') &&
                  <div key={configuration.name} className={s.Input}>
                    <IoConfigField
                      name={configuration.name}
                      isRequired={configuration.isRequired}
                      type={configuration.type}
                      help={configuration.help}
                      label={configuration.label}
                      value={configurations[configuration.name]}
                      onChange={(v) => onChange({
                        ...configurations,
                        [configuration.name]: v
                      })}
                      configurations={configurations}
                      enum={configuration.enum}
                      mapType={configuration.mapType}
                    />
                  </div>
                }

                {configuration.type === 'map' && typeof(configuration.mapType) === 'object' &&
                  <div className={s.MapObjects}>

                    {Object.keys(configurations[configuration.name]).map(configurationKey => {
                      const x = configurations[configuration.name]
                      const z = typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date) ? x : null;

                      const g = z ? z[configurationKey] : null;
                      const w = typeof g === 'object' && !Array.isArray(g) && !(g instanceof Date) ? g : null;

                      return (
                        <div className={s.MapObject} key={configurationKey}>
                          <div className={s.MapObjectDelete}>
                            <Button
                              svgIcon={deleteIcon}
                              onClick={() => reduceMap(configuration.name, configurationKey)}
                              type="danger"
                              title={`Delete ${configuration.label.toLowerCase().slice(0, -1)}`}
                            />
                          </div>

                          {typeof configuration.mapType === 'object' && w &&
                            <AttachmentsFields
                              configurations={w}
                              attachment={configuration.mapType}
                              attachmentName={configuration.name}
                              onChange={(v) => changeMap(configuration.name, configurationKey, v)}
                            />
                          }
                         </div> 
                      )
                    })}

                    <button
                      className={`${sl.AddButton} ${sl.AddButtonEnabled}`}
                      type="button"
                      onClick={() => expandMap(configuration.name)}
                    >
                      {`Add ${configuration.label.toLowerCase().slice(0, -1)}`}
                    </button>
                  </div>
                }

                {configuration.type === 'conditionalAttachments' && configuration.conditionalAttachments && 
                  <div className={s.MapObject}>
                    <AttachmentsFields
                      configurations={configurations[configuration.name][configurations[configuration.conditionalAttachments.limitation].toString()]}
                      attachment={configuration.conditionalAttachments.fields[configurations[configuration.conditionalAttachments.limitation].toString()]}
                      attachmentName={configurations[configuration.conditionalAttachments.limitation].toString()}
                      onChange={(v) => changeAttachment(configuration.name, v, configurations[configuration.conditionalAttachments.limitation].toString())}
                    />
                  </div>
                }
              </> 
            }
          </div>
        </FormItem>
      ))}

      <div className={`${s.Buttons}`}>
        <Button
          text={props.action === 'create' ? 'Create' : 'Update'}
          onClick={() => props.updateIo({
            tenant: props.tenant,
            namespace: props.namespace,
            action: props.action,
            configurations
          })}
          type='primary'
        />
        <Button
          text={`${hideUnrequired ? 'Show' : 'Hide'} unrequired`}
          onClick={() => setHideUnrequired(!hideUnrequired)}
          type='regular'
        />
      </div> 
    </div>
  )
}

export default IoUpdate;