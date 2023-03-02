import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import { useNavigate } from 'react-router-dom';

import * as Modals from '../../../app/contexts/Modals/Modals';
import Button from '../../../ui/Button/Button';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../ui/ConfigurationTable/FormItem/FormItem';
import { H1 } from '../../../ui/H/H';
import IoConfigField from '../IoConfigField/IoConfigField';
import { sinkConfigurationsFields, StringMap, PathToConnector, SinkConfigurations, SinkConfigurationValue, sinkConfigurations, InputsSpecs, Resources } from '../Sinks/configurationsFields/configurationsFields';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { SourceConfigurations, SourceConfigurationValue, sourceConfigurationsFields, sourceConfigurations, BatchSourceConfig, ProducerConfig } from '../Sources/configurationsFields/configurationsFields';
import { ElasticSearchSslConfigs } from '../Sinks/configurationsFields/connectrosConfigs/connectors/elasticsearchConfigs';
import { SinkConnectorsConfigs } from '../Sinks/configurationsFields/connectrosConfigs/configs';
import deleteIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/delete.svg';
import enableIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';

import s from './IoUpdate.module.css';
import sl from '../../../ui/ConfigurationTable/ListInput/ListInput.module.css';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { SourceConnectorsConfigs } from '../Sources/configurationsFields/connectrosConfigs/configs';

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

  const changeAttachment = (configurationName: string, attachmentName: string, value: string | number | boolean | string[] | StringMap | PathToConnector,  nestedName?: string) => {
    const newAttachment = _.cloneDeep(configurations);
    const x = newAttachment[configurationName]

    if (typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date)) {
      const y = x[attachmentName];

      if (typeof y === 'object' && !Array.isArray(y) && !(y instanceof Date) && nestedName) {
        y[nestedName] = value;
      } else if (typeof value !== 'object') {
        x[attachmentName] = value; 
      }
    }
    onChange(newAttachment);
  }

  const changeMap = (configurationName: string, configurationKey: string, keyName: string, value: string | number | boolean | string[] | StringMap | PathToConnector, attachmentName?: string) => {
    const newMap = _.cloneDeep(configurations);
    const x = newMap[configurationName];

    // if (configurationName === 'inputsSpecs') {
    //   if (attachmentName) {
    //     const X = newMap[configurationName][configurationKey][keyName];
    //     if (typeof(X) === 'object' && isComplexString(value)) {
    //       X[attachmentName] = value;
    //     }
    //   } else {
    //     if (!Array.isArray(value) && !isPathToConnector(value)) {
    //       newMap[configurationName][configurationKey][keyName] = value;
    //     }
    //   }
    // }

    if (typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date)) {
      const y = x[configurationKey];

      if (typeof y === 'object' && !Array.isArray(y) && !(y instanceof Date)) {
        const z = y[keyName];

        if (typeof z === 'object' && !Array.isArray(z) && !(z instanceof Date)) {
          if (attachmentName) {
            if (isComplexString(value)) {
              z[attachmentName] = value;
            }
          } else {
            if (!Array.isArray(value) && !isPathToConnector(value)) {
              y[keyName] = value;
            }
          }
        } else {
          y[keyName] = value;
        }
      }
    }

    setConfigurations(newMap);
  }

  const changeConditionalAttachments = (configurationName: string, attachmentName: string, field: string, value: string | number | boolean | string[] | StringMap, nestedName?: string) => {
    const newAttachment = _.cloneDeep(configurations);

    if (configurationName === 'configs' && !Array.isArray(value)) {
      let attachment = newAttachment[configurationName][field][attachmentName];
      if (nestedName && isElasticSearchSslConfigs(attachment) && (typeof(value) === 'string' || typeof(value) === 'boolean')) {
        attachment[nestedName] = value;
      } else {
        attachment = value;
      }
      newAttachment[configurationName][field][attachmentName] = attachment;
      onChange(newAttachment);
    }
  }

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
                    {configuration.attachments.map(attachment => {
                      const x = configurations[configuration.name]
                      const z = typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date) ? x : null;

                      const y = z ? z[attachment.name] : null;
                      const w = typeof y === 'object' && !Array.isArray(y) && !(y instanceof Date) ? y : null;

                      return (
                        <FormItem key={attachment.name}>
                          <div className={s.MapObjectBlock}>
                            <div className={s.Label}>
                              <FormLabel content={attachment.label} />
                              <div className={s.EntryButton}>
                                <Button
                                  svgIcon={enableIcon}
                                  onClick={() => {}}
                                  title='help information'
                                  type='primary'
                                />
                              </div>
                            </div>

                            {!attachment.attachments && z &&
                              <div className={s.Input}>
                                <IoConfigField
                                  name={attachment.name}
                                  isRequired={attachment.isRequired}
                                  type={attachment.type}
                                  help={attachment.help}
                                  label={attachment.label}
                                  value={z[attachment.name]}
                                  onChange={(v) => changeAttachment(configuration.name, attachment.name, v)}
                                  configurations={configurations}
                                  enum={attachment.enum}
                                  mapType={attachment.mapType}
                                />
                              </div>
                            }

                            {attachment.attachments && attachment.attachments.map(nested => {
                              return (
                                <FormItem key={nested.name}>
                                  <div className={s.MapObjectBlock}>
                                    <div className={s.Label}>
                                      <FormLabel content={nested.label} />
                                      <div className={s.EntryButton}>
                                        <Button
                                          svgIcon={enableIcon}
                                          onClick={() => {}}
                                          title='help information'
                                          type='primary'
                                        />
                                      </div>
                                    </div>
                                    
                                    {z && w && <div className={s.Input}>
                                      <IoConfigField
                                        name={nested.name}
                                        isRequired={nested.isRequired}
                                        type={nested.type}
                                        help={nested.help}
                                        label={nested.label}
                                        value={w[nested.name]}
                                        onChange={(v) => changeAttachment(configuration.name, attachment.name, v, nested.name)}
                                        configurations={w}
                                        enum={nested.enum}
                                        mapType={nested.mapType}
                                      />
                                    </div>}
                                  </div>
                                </FormItem>
                              )
                            })}

                          </div>
                        </FormItem>
                      )
                    })}
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
                    {Object.keys(configurations[configuration.name]).map(configurationKey => (
                      <div key={configurationKey} className={s.MapObject}>
                        <div className={s.MapObjectDelete}>
                          <Button
                            svgIcon={deleteIcon}
                            onClick={() => reduceMap(configuration.name, configurationKey)}
                            type="danger"
                            title={`Delete ${configuration.label.toLowerCase().slice(0, -1)}`}
                          />
                        </div>
                        {configuration.mapType && configuration.mapType !== 'string' && configuration.mapType.map(key => {

                          const x = configurations[configuration.name]
                          const z = typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date) ? x : null;

                          const y = z ? z[configurationKey] : null;
                          const w = typeof y === 'object' && !Array.isArray(y) && !(y instanceof Date) ? y : null;

                          const k = w ? w[key.name] : null;
                          const l = typeof k === 'object' && !Array.isArray(k) && !(k instanceof Date) ? k : null;

                          return (
                            <div key={key.name} className={`${key.attachments ? s.MapObjectAttachmentBlock : s.MapObjectBlock}`}>
                              <div className={`${s.Label} ${sf.FormItem}`} >
                                <FormLabel
                                  content={key.label}
                                  isRequired={configuration.isRequired}
                                />
                                <div className={s.EntryButton}>
                                  <Button
                                    svgIcon={enableIcon}
                                    onClick={() => {}}
                                    title='help information'
                                    type='primary'
                                  />
                                </div>
                              </div>
                              {key.attachments && l &&
                                <div className={s.MapObject}>
                                  {key.attachments.map((attachment) => (
                                    <div className={s.Field} key={attachment.name}>
                                      <div className={s.Label}>
                                        <FormLabel
                                          content={attachment.label}
                                          isRequired={configuration.isRequired}
                                        />
                                        <div className={s.EntryButton}>
                                          <Button
                                            svgIcon={enableIcon}
                                            onClick={() => {}}
                                            title='help information'
                                            type='primary'
                                          />
                                        </div>
                                      </div>
                                      <div className={s.Input}>
                                        <IoConfigField
                                          name={attachment.name}
                                          isRequired={attachment.isRequired}
                                          type={attachment.type}
                                          help={attachment.help}
                                          label={attachment.label}
                                          value={l[attachment.name]}
                                          onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value, attachment.name)}
                                          configurations={l}
                                          enum={attachment.enum}
                                          mapType={attachment.mapType}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              }

                              {configuration.mapType && !key.attachments && (key.type !== 'map' || typeof(key.mapType) === 'string') && w &&
                                <div key={key.name} className={s.Input}>
                                  <IoConfigField
                                    name={key.name}
                                    isRequired={key.isRequired}
                                    type={key.type}
                                    help={key.help}
                                    label={key.label}
                                    value={w[key.name]}
                                    onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value)}
                                    configurations={w}
                                    enum={key.enum}
                                    mapType={key.mapType}
                                  />
                                </div>
                              }
                            </div>
                          )
                        })}

                      </div>
                    ))}
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
                    {configuration.conditionalAttachments.fields[configurations[configuration.conditionalAttachments.limitation].toString()].map(attachment => {
                      const connectorsConfigs = configurations[configuration.name];
                      const nesteds = isConnectorsConfigs(connectorsConfigs) &&
                        configuration.conditionalAttachments &&
                        connectorsConfigs[configurations[configuration.conditionalAttachments.limitation].toString()][attachment.name];
                      
                      return (
                        <div className={`${s.MapObjectBlock} ${s.Field}`} key={attachment.name}>
                          <div className={s.Label}>
                            <FormLabel content={attachment.label} />
                            <div className={s.EntryButton}>
                              <Button
                                svgIcon={enableIcon}
                                onClick={() => {}}
                                title='help information'
                                type='primary'
                              />
                            </div>
                          </div>

                          {attachment.attachments && 
                            <div key={attachment.name} className={s.MapObject}>
                              {attachment.attachments.map(nested => {
                                return (
                                  <div key={nested.name} className={`${s.MapObjectBlock}`}>
                                    <div className={s.Label}>
                                      <FormLabel content={nested.label} />
                                      <div className={s.EntryButton}>
                                        <Button
                                          svgIcon={enableIcon}
                                          onClick={() => {}}
                                          title='help information'
                                          type='primary'
                                        />
                                      </div>
                                    </div>
                                    <div className={s.Input}>
                                      {typeof nesteds !== 'undefined' &&
                                        <IoConfigField
                                          name={nested.name}
                                          isRequired={nested.isRequired}
                                          type={nested.type}
                                          help={nested.help}
                                          label={nested.label}
                                          value={isElasticSearchSslConfigs(nesteds) && nesteds[nested.name]}
                                          onChange={
                                            (v) => configuration.conditionalAttachments &&
                                            changeConditionalAttachments(
                                              configuration.name,
                                              attachment.name,
                                              configurations[configuration.conditionalAttachments.limitation].toString(),
                                              v,
                                              nested.name,
                                            )
                                          }
                                          configurations={configurations}
                                          enum={nested.enum}
                                          mapType={nested.mapType}
                                        />
                                      }
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          }
                          
                          {!attachment.attachments && (attachment.type !== 'map' || typeof(attachment.mapType) === 'string') &&
                            <div key={attachment.name} className={s.Input}>
                              {typeof nesteds !== 'undefined' &&
                                <IoConfigField
                                  name={attachment.name}
                                  isRequired={attachment.isRequired}
                                  type={attachment.type}
                                  help={attachment.help}
                                  label={attachment.label}
                                  value={!isElasticSearchSslConfigs(nesteds) && nesteds} 
                                  onChange={
                                    (v) => configuration.conditionalAttachments && 
                                    changeConditionalAttachments(
                                      configuration.name, 
                                      attachment.name,
                                      configurations[configuration.conditionalAttachments.limitation].toString(),
                                      v
                                    )
                                  }
                                  configurations={configurations}
                                  enum={attachment.enum}
                                  mapType={attachment.mapType}
                                />
                              }
                            </div>
                          }
                        </div>
                      )
                    })}
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