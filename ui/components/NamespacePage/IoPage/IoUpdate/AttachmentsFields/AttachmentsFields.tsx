import React from 'react';
import _ from 'lodash';

import Button from '../../../../ui/Button/Button';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import enableIcon from '../../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';
import IoConfigField, { Attachment, IoConfigField as IoConfigFieldType } from '../../IoConfigField/IoConfigField';
import { PathToConnector, SinkConfigurationValue, StringMap } from '../../Sinks/configurationsFields/configurationsFields';
import { SourceConfigurationValue } from '../../Sources/configurationsFields/configurationsFields';

import s from '../IoUpdate.module.css';

type AttachmentConfigurations = Attachment;

type AttachmentsFieldsProps = {
  attachment: IoConfigFieldType[],
  attachmentName: string,
  configurations: AttachmentConfigurations,
  onChange: (attachment: Attachment) => void,
}

const AttachmentsFields = (props: AttachmentsFieldsProps) => {
  const { attachment, configurations, attachmentName, onChange } = props;

  const isComplexString = (configurationValue: SinkConfigurationValue | SourceConfigurationValue): configurationValue is string | string[] => {
    if (typeof(configurationValue) !== 'number' && typeof(configurationValue) !== 'boolean' && ((typeof(configurationValue) === 'object' && Array.isArray(configurationValue)) || typeof(configurationValue) === 'string' || Array.isArray(configurationValue))) {
      return true;
    }
    
    return false;
  }

  const changeAttachment = (configurationName: string, value: string | number | boolean | string[] | StringMap | PathToConnector | Attachment,  nestedName?: string) => {
    const newAttachment = _.cloneDeep(configurations);
    const x = newAttachment[configurationName];

    if (typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date) && nestedName) {
      const y = x[nestedName];

      if (typeof y === 'object' && !Array.isArray(y) && !(y instanceof Date) && nestedName) {
        y[nestedName] = value;
      } else if (typeof value !== 'object') {
        x[attachmentName] = value; 
      }
    } else {
      newAttachment[configurationName] = value
    }

    onChange(newAttachment);
  }

  return (
    <>
      {attachment.map(nested => {
        const x = configurations[nested.name]
        const z = typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date) ? x : null;

        return (
          <FormItem key={nested.name}>
            <div className={`${s.Field}`}>
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

              {!nested.attachments &&
                <div className={s.Input}>
                  <IoConfigField
                    name={nested.name}
                    isRequired={nested.isRequired}
                    type={nested.type}
                    help={nested.help}
                    label={nested.label}
                    value={configurations[nested.name]}
                    onChange={(v) => changeAttachment(nested.name, v)}
                    configurations={z || configurations}
                    enum={nested.enum}
                    mapType={nested.mapType}
                  />
                </div>
              }

              {nested.attachments && z &&
                <div className={`${s.MapObject}`}>
                  <AttachmentsFields
                    attachment={nested.attachments}
                    attachmentName={nested.name}
                    configurations={z}
                    onChange={(v) => {changeAttachment(nested.name, v)}}
                  />
                </div> 
              }
            </div>
          </FormItem>
        )
      })}
    </>
  )
}

export default AttachmentsFields;