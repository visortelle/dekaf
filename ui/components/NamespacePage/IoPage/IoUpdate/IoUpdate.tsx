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
import { sinkConfigurationsFields, StringMap, PathToConnector, SinkConfigurations, sinkConfigurations, InputsSpecs, Resources, InputSpecs } from '../Sinks/configurationsFields/configurationsFields';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { SourceConfigurations, sourceConfigurationsFields, sourceConfigurations, BatchSourceConfig, ProducerConfig } from '../Sources/configurationsFields/configurationsFields';
import { SinkConnectorsConfigs } from '../Sinks/configurationsFields/connectrosConfigs/configs';
import { SourceConnectorsConfigs } from '../Sources/configurationsFields/connectrosConfigs/configs';
import AttachmentsFields from './AttachmentsFields/AttachmentsFields';

import deleteIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/delete.svg';
import enableIcon from '../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';

import s from './IoUpdate.module.css';
import sl from '../../../ui/ConfigurationTable/ListInput/ListInput.module.css';
import { UpdateSourceProps } from './updateSource';
import { UpdateSinkProps } from './updateSink';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';

type IoProps = {
  tenant: string,
  namespace: string,
  action: 'edit' | 'create',
  configurations: SinkConfigurations | SourceConfigurations,
}

type IoUpdateProps = IoProps & {
  ioType: 'sink' | 'source',
  updateIo: (props: UpdateSourceProps | UpdateSinkProps) => Promise<void>,
}

export type CommonData = string | number | boolean | string[] | Date;
export type AttachmentData = CommonData | Attachment;

export const isAttachment = (configuration: AttachmentData | null): configuration is Attachment => {
  if (typeof configuration === 'object' && !Array.isArray(configuration) && !(configuration instanceof Date)) {
    return true;
  } else {
    return false;
  }
}

const IoUpdate = (props: IoUpdateProps) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();
  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const [configurations, setConfigurations] = useState(props.configurations);
  const [hideUnrequired, setHideUnrequired] = useState(true);

  const configurationsFields = props.ioType === 'sink' ? sinkConfigurationsFields : sourceConfigurationsFields;
  const defaultConfigurations = props.ioType === 'sink' ? sinkConfigurations : sourceConfigurations;

  const isInputsSpecs = (_: string | number | boolean | string[] | StringMap | InputsSpecs | Resources | PathToConnector | SinkConnectorsConfigs | BatchSourceConfig | ProducerConfig | SourceConnectorsConfigs | Date): _ is InputsSpecs => {
    return true;
  }
  const isInputSpecs = (_: Attachment): _ is InputSpecs => {
    return true;
  }

  const onChange = (configurations: SinkConfigurations | SourceConfigurations) => {
    setConfigurations(configurations);
  }

  const expandMap = (key: string) => {
    const newMap =  _.cloneDeep(configurations);
    const newMapKey = newMap[key];
    const defaultData = defaultConfigurations[key];
    if (defaultData && isInputsSpecs(defaultData) && isInputsSpecs(newMapKey)) {
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

  const changeAttachment = (configurationName: string,  value: Attachment, condition?: string) => { 
    const newAttachment = _.cloneDeep(configurations);
    
    if (condition) {
      const x = newAttachment[configurationName]

      if (isAttachment(x)) {
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

    if (isInputsSpecs(x) && isInputSpecs(value)) {
      x[configurationKey] = value;
      setConfigurations(newMap);
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

      {configurationsFields.map(configuration => {
        const r = configurations[configuration.name];
        const n = isAttachment(r) ? r : null;

        const conditionalAttachmentLimitation = configuration.conditionalAttachments ? configurations[configuration.conditionalAttachments.limitation].toString() : '';
        const conditionalAttachmentConfigurations = n ? n[conditionalAttachmentLimitation] : null;
        const G = isAttachment(conditionalAttachmentConfigurations) ? conditionalAttachmentConfigurations : null;

        return (
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

                  {configuration.attachments && n &&
                    <div className={s.MapObject}>
                      <AttachmentsFields
                        configurations={n}
                        attachment={configuration.attachments}
                        attachmentName={configuration.name}
                        onChange={(v) => changeAttachment(configuration.name, v)}
                        ioType={props.ioType}
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
                        ioType={props.ioType}
                        configurations={configurations}
                        enum={configuration.enum}
                        mapType={configuration.mapType}
                      />
                    </div>
                  }

                  {configuration.type === 'map' && typeof(configuration.mapType) === 'object' &&
                    <div className={s.MapObjects}>

                      {Object.keys(configurations[configuration.name]).map(configurationKey => {
                        const x = configurations[configuration.name];
                        const z = isAttachment(x) ? x[configurationKey] : null;
                        const w = isAttachment(z) ? z : null;

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
                                ioType={props.ioType}
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

                  {configuration.type === 'conditionalAttachments' && configuration.conditionalAttachments && n && G &&
                    <div className={s.MapObject}>
                      <AttachmentsFields
                        configurations={G}
                        attachment={configuration.conditionalAttachments.fields[conditionalAttachmentLimitation]}
                        attachmentName={conditionalAttachmentLimitation}
                        onChange={(v) => changeAttachment(configuration.name, v, conditionalAttachmentLimitation)}
                        ioType={props.ioType}
                      />
                    </div>
                  }
                </> 
              }
            </div>
          </FormItem>
        )
      })}

      <div className={`${s.Buttons}`}>
        <Button
          text={props.action === 'create' ? 'Create' : 'Update'}
          onClick={() => props.updateIo({
            tenant: props.tenant,
            namespace: props.namespace,
            action: props.action,
            configurations: configurations,
            ioServiceClient: ioServiceClient,
            notifyError: notifyError,
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