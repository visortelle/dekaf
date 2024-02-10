import React, { useCallback, useEffect } from 'react';
import { isPlainObject } from 'lodash';
import { nanoid } from 'nanoid';
import * as Either from 'fp-ts/lib/Either';

import Button from '../../../Button/Button';
import Input from '../../../Input/Input';
import Select from '../../../Select/Select';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { CreateProducerRequest, DeleteProducerRequest, MessageFormat, ProducerMessage, SendRequest } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/producer_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import DatetimePicker from '../../../DatetimePicker/DatetimePicker';
import CodeEditor from '../../../CodeEditor/CodeEditor';
import KeyValueEditor, { recordFromIndexedKv, recordToIndexedKv } from '../../../KeyValueEditor/KeyValueEditor';

import sendIcon from './icons/send.svg';

import s from './Producer.module.css'
import { ValueType } from './types';
import { valueToBytes } from './lib/lib';

export type ProducerPreset = {
  topic: string | undefined;
  key: string;
}

export type ProducerProps = {
  preset: ProducerPreset;
};

const Producer: React.FC<ProducerProps> = (props) => {
  const [key, setKey] = React.useState<string>(props.preset.key);
  const [valueType, setValueType] = React.useState<ValueType>('json');
  const [value, setValue] = React.useState<string>('');
  const producerName = React.useRef<string>(`__dekaf_` + nanoid());
  const [eventTime, setEventTime] = React.useState<Date | undefined>(undefined);
  const [propertiesJsonMap, setPropertiesJsonMap] = React.useState<string>("{}");
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { producerServiceClient } = GrpcClient.useContext();

  const sendMessage = async () => {
    const sendReq: SendRequest = new SendRequest();
    sendReq.setProducerName(producerName.current);

    const messageValue = valueToBytes(value, valueType);

    let properties: undefined | Record<string, string> = undefined;
    try {
      const validationErr = `Properties must be a JSON object where all values are strings.`

      properties = JSON.parse(propertiesJsonMap);
      if (!isPlainObject(properties) || properties === undefined) {
        notifyError(validationErr);
        return;
      }

      const isValid = Object.entries(properties).every(([_, value]) => typeof value === 'string');
      if (!isValid) {
        notifyError(validationErr);
        return;
      }
    } catch (err) {
      notifyError(`Unable to parse message properties: ${err}`);
      return;
    }

    if (Either.isRight(messageValue)) {
      const message = new ProducerMessage();
      message.setValue(messageValue.right);
      message.setKey(key);

      const propertiesMap = message.getPropertiesMap();
      Object.entries(properties).forEach(([key, value]) => {
        propertiesMap.set(key, value);
      });

      if (eventTime !== undefined) {
        message.setEventTime(eventTime.getTime());
      }

      sendReq.setMessagesList([message]);
    } else {
      notifyError(`Unable to send message: ${messageValue.left}`);
      return;
    }

    if (valueType === 'json') {
      sendReq.setFormat(MessageFormat.MESSAGE_FORMAT_JSON);
    } else {
      sendReq.setFormat(MessageFormat.MESSAGE_FORMAT_BYTES);
    }

    const res = await producerServiceClient.send(sendReq, {}).catch(err => notifyError(`Unable to send a message. ${err}`));
    if (res === undefined) {
      return;
    }
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to send a message. ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(`Message successfully sent`, nanoid(), true);
  }

  const cleanup = useCallback(async () => {
    const deleteProducerRequest = new DeleteProducerRequest();
    deleteProducerRequest.setProducerName(producerName.current);
    const res = await producerServiceClient.deleteProducer(deleteProducerRequest, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete producer ${producerName.current}: ${res.getStatus()?.getMessage()}`);
    }
  }, [producerName]);

  useEffect(() => {
    initializeSession();
    window.addEventListener('beforeunload', cleanup);

    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    }
  }, []);

  const initializeSession = async () => {
    if (props.preset.topic === undefined) {
      return;
    }

    const createProducerReq: CreateProducerRequest = new CreateProducerRequest();
    createProducerReq.setProducerName(producerName.current);
    createProducerReq.setTopic(props.preset.topic);
    const res = await producerServiceClient.createProducer(createProducerReq, {}).catch(err => notifyError(`Unable to create producer ${producerName.current}: ${err}`));

    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create producer ${producerName.current}: ${res.getStatus()?.getMessage()}`);
    }
  }

  const changePropertiesJsonMap = async (v: string) => {
    await setPropertiesJsonMap(v || "")
  }

  return (
    <div
      className={s.Producer}
      onKeyDown={e => {
        if (e.ctrlKey && e.key === 'Enter') {
          sendMessage();
        }
      }}
    >
      <div className={s.Content}>
        <div className={s.Config}>
          <div className={s.ConfigLeft}>
            <div className={s.FormControl}>
              <strong>Value encoding</strong>
              <Select<ValueType>
                value={valueType}
                onChange={v => setValueType(v as ValueType)}
                list={[
                  { type: 'item', title: 'JSON', value: 'json' },
                  { type: 'item', title: 'Bytes (hex)', value: 'bytes-hex' },
                ]}
                size='small'
              />
            </div>
            <div className={s.FormControl}>
              <strong>Key</strong>
              <Input onChange={v => setKey(v)} value={key || ''} placeholder="" size='small' />
            </div>
            <div className={s.FormControl}>
              <strong>Event time</strong>
              <DatetimePicker
                value={eventTime}
                onChange={v => setEventTime(v)}
                clearable
              />
            </div>
            <div className={s.FormControl}>
              <strong>Properties</strong>
              <KeyValueEditor
                value={recordToIndexedKv(JSON.parse(propertiesJsonMap))}
                onChange={v => changePropertiesJsonMap(JSON.stringify(recordFromIndexedKv(v)) || '')}
                height="240rem"
              />
            </div>
          </div>

          <div className={s.ConfigRight}>
            <div className={s.FormControl}>
              <strong>Value</strong>
              {valueType === 'json' && (
                <CodeEditor
                  value={value}
                  onChange={v => setValue(v || '')}
                  language="json"
                  height="260rem"
                />
              )}
              {valueType === 'bytes-hex' && (
                <CodeEditor
                  value={value}
                  onChange={v => setValue(v || '')}
                  height="480rem"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={s.Toolbar}>
        <div className={s.ToolbarControl}>
          <Button
            onClick={sendMessage}
            type='primary'
            svgIcon={sendIcon}
            text="Send"
            size='small'
          />
        </div>
      </div>
    </div>
  );
}

export default Producer;
