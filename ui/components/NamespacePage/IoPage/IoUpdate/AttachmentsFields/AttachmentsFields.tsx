import React from 'react';
import _ from 'lodash';

import Button from '../../../../ui/Button/Button';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import enableIcon from '../../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';
import IoConfigField, { Attachment, IoConfigField as IoConfigFieldType } from '../../IoConfigField/IoConfigField';
import { CryptoConfig } from '../../Sources/configurationsFields/configurationsFields';
import { ElasticSearchSslConfigs } from '../../Sinks/configurationsFields/connectrosConfigs/connectors/elasticsearchConfigs';
import { AttachmentData, CommonData, isAttachment } from '../IoUpdate';

import s from '../IoUpdate.module.css';

type AttachmentConfigurations = Attachment;

type AttachmentsFieldsProps = {
  ioType: 'sink' | 'source',
  attachment: IoConfigFieldType[],
  attachmentName: string,
  configurations: AttachmentConfigurations,
  onChange: (attachment: Attachment) => void,
}

type Nested = CommonData | CryptoConfig | ElasticSearchSslConfigs;

const AttachmentsFields = (props: AttachmentsFieldsProps) => {
  const { attachment, configurations, attachmentName, onChange } = props;

  const isNested = (x: AttachmentData): x is Nested => {
    return true;
  }

  const changeAttachment = (configurationName: string, value: AttachmentData,  nestedName?: string) => {
    const newAttachment = _.cloneDeep(configurations);
    const x = newAttachment[configurationName];

    if (isAttachment(x) && nestedName) {
      const y = x[nestedName];
      if (isAttachment(y) && isNested(value)) {
        y[nestedName] = value;
      }
    } else if (isNested(value)) {
      newAttachment[configurationName] = value
    }

    onChange(newAttachment);
  }

  return (
    <>
      {attachment.map(nested => {
        const x = configurations[nested.name]
        const z = isAttachment(x) ? x : null;

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
                    ioType={props.ioType}
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
                    ioType={props.ioType}
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