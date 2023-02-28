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
import { configurationsFields, configurations as defaultConfigurations, Configurations, ConfigurationValue, StringMap, PathToConnector } from '../Sinks/configurationsFields/configurationsFields';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { ElasticSearchSslConfigs } from '../Sinks/configurationsFields/connectrosConfigs/connectors/elasticsearchConfigs';
import { ConnectorsConfigs } from '../Sinks/configurationsFields/connectrosConfigs/configs';
import deleteIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/delete.svg';
import enableIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';

import s from './IoUpdate.module.css';
import sl from '../../../ui/ConfigurationTable/ListInput/ListInput.module.css';
import sf from '../../../ui/ConfigurationTable/form.module.css';

type IoProps = {
  tenant: string,
  namespace: string,
  action: 'edit' | 'create',
  configurations: Configurations,
}

type IoUpdateProps = IoProps & {
  updateIo: (props: IoProps) => Promise<void>,
}

const IoUpdate = (props: IoUpdateProps) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const [configurations, setConfigurations] = useState(props.configurations);
  const [hideUnrequired, setHideUnrequired] = useState(true);

  const isConnectorsConfigs = (value: ConfigurationValue): value is ConnectorsConfigs => {
    if (typeof(value) === 'object' && !Array.isArray(value) && value.hasOwnProperty('aerospike')) {
      return true;
    }
    return false;
  }

  const isElasticSearchSslConfigs = (value: string | number | boolean | StringMap | ElasticSearchSslConfigs): value is ElasticSearchSslConfigs => {
    if (typeof(value) === 'object') {
      return true;
    }
    return false;
  }

  const isComplexString = (configurationValue: ConfigurationValue): configurationValue is string | string[] => {
    if (typeof(configurationValue) !== 'number' && typeof(configurationValue) !== 'boolean' && ((typeof(configurationValue) === 'object' && Array.isArray(configurationValue)) || typeof(configurationValue) === 'string' || Array.isArray(configurationValue))) {
      return true;
    }
    
    return false;
  }

  const isPathToConnector = (configurationValue: ConfigurationValue): configurationValue is PathToConnector => {
    if (typeof(configurationValue) === 'string' || typeof(configurationValue) === 'number' || typeof(configurationValue) === 'boolean' || Array.isArray(configurationValue)) {
      return false;
    }

    return configurationValue.path ? true : false;
  }

  const onChange = (configurations: Configurations) => {
    setConfigurations(configurations);
  }

  const expandMap = (key: string) => {
    if (key === 'inputsSpecs') {
      const newMap =  _.cloneDeep(configurations);
      const defaultdata = Object.keys(defaultConfigurations[key])[0];
      newMap[key] = {
        ...newMap[key],
        [uuid()]: defaultConfigurations[key][defaultdata]
      };
      setConfigurations(newMap);
    }
  }

  const reduceMap = (key: string, index: string) => {
    if (key === 'inputsSpecs') {
      const newMap =  _.cloneDeep(configurations);
      delete newMap[key][index];
      setConfigurations(newMap);
    }
  }

  const changeAttachment = (configurationName: string, attachmentName: string, value: string | number | boolean | string[] | StringMap | PathToConnector) => {
    const newAttachment = _.cloneDeep(configurations);

    if (configurationName === 'resources' && typeof(value) === 'number') {
      newAttachment[configurationName][attachmentName] = value;
    }
    onChange(newAttachment);
  }

  const changeMap = (configurationName: string, configurationKey: string, keyName: string, value: string | number | boolean | string[] | StringMap | PathToConnector, attachmentName?: string) => {
    const newMap = _.cloneDeep(configurations);

    if (configurationName === 'inputsSpecs') {
      if (attachmentName) {
        const X = newMap[configurationName][configurationKey][keyName];
        if (typeof(X) === 'object' && isComplexString(value)) {
          X[attachmentName] = value;
        }
      } else {
        if (!Array.isArray(value) && !isPathToConnector(value)) {
          newMap[configurationName][configurationKey][keyName] = value;
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
          {props.action === 'create' && <>Create sink</>}
          {props.action === 'edit' && 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              Update sink
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
            {props.action === 'edit' && configuration.name !== 'pathToConnector' &&
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
                    {configuration.attachments.map(attachment => (
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
                          <div className={s.Input}>
                            <IoConfigField
                              name={attachment.name}
                              isRequired={attachment.isRequired}
                              type={attachment.type}
                              help={attachment.help}
                              label={attachment.label}
                              value={configurations[configuration.name][attachment.name as keyof ConfigurationValue]}
                              onChange={(v) => changeAttachment(configuration.name, attachment.name, v)}
                              configurations={configurations}
                              enum={attachment.enum}
                              mapType={attachment.mapType}
                            />
                          </div>
                        </div>
                      </FormItem>
                    ))}
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
                        {configuration.mapType && configuration.mapType !== 'string' && configuration.mapType.map(key => (
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
                            {key.attachments &&
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
                                        value={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name][attachment.name]}
                                        onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value, attachment.name)}
                                        configurations={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name]}
                                        enum={attachment.enum}
                                        mapType={attachment.mapType}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            }

                            {configuration.mapType && !key.attachments && (key.type !== 'map' || typeof(key.mapType) === 'string') &&
                              <div key={key.name} className={s.Input}>
                                <IoConfigField
                                  name={key.name}
                                  isRequired={key.isRequired}
                                  type={key.type}
                                  help={key.help}
                                  label={key.label}
                                  value={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name]}
                                  onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value)}
                                  configurations={configurations[configuration.name][configurationKey as keyof ConfigurationValue]}
                                  enum={key.enum}
                                  mapType={key.mapType}
                                />
                              </div>
                            }
                          </div>
                        ))}

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
                    {configuration.conditionalAttachments.fields[configurations[configuration.conditionalAttachments.limitation]].map(attachment => {
                      const connectorsConfigs = configurations[configuration.name];
                      const nesteds = isConnectorsConfigs(connectorsConfigs) && configuration.conditionalAttachments && connectorsConfigs[configurations[configuration.conditionalAttachments.limitation]][attachment.name];
                      
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
                                          onChange={(v) => configuration.conditionalAttachments && changeConditionalAttachments(configuration.name, attachment.name, configurations[configuration.conditionalAttachments.limitation], v, nested.name)}
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
                                  onChange={(v) => configuration.conditionalAttachments && changeConditionalAttachments(configuration.name, attachment.name, configurations[configuration.conditionalAttachments.limitation], v)}
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
          disabled={
            !configurations.name ||
            !configurations.inputs.length ||
            !configurations.inputs[0].length ||
            !configurations.pathToConnector.path
          }
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