import React, {useCallback, useEffect, useState} from 'react';
import {isPlainObject} from 'lodash';
import {nanoid} from 'nanoid';
import * as Either from 'fp-ts/lib/Either';
import Button from '../../../../ui/Button/Button';
import Input from '../../../../ui/Input/Input';
import Select from '../../../../ui/Select/Select';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import {
  CreateProducerRequest,
  DeleteProducerRequest,
  MessageFormat,
  ProducerMessage,
  SendRequest
} from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/producer_pb';
import {Code} from '../../../../../grpc-web/google/rpc/code_pb';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';
import KeyValueEditor from '../../../../ui/KeyValueEditor/KeyValueEditor';
import sendIcon from './icons/send.svg';
import doneIcon from './icons/done.svg';
import closeIcon from '../../../../ui/Tabs/close.svg';

import s from './Producer.module.css';
import {ValueType} from './types';
import {valueToBytes} from './lib/lib';
import {ClipLoader} from "react-spinners";
import SvgIcon from "../../../../ui/SvgIcon/SvgIcon";

export type ProducerPreset = {
  topic: string | undefined;
  key: string;
}

export type ProducerProps = {
  preset: ProducerPreset;
};

type ProducerInit = {
  isReady: boolean,
  isLoading: boolean,
  initFailed: boolean
}

const Producer: React.FC<ProducerProps> = (props) => {
  const [key, setKey] = React.useState<string>(props.preset.key);
  const [valueType, setValueType] = React.useState<ValueType>('json');
  const [value, setValue] = React.useState<string>('');
  const producerName = React.useRef<string>(`__pulsocat_` + nanoid());
  const [eventTime, setEventTime] = React.useState<Date | undefined>(undefined);
  const [propertiesJsonMap, setPropertiesJsonMap] = React.useState<string>("{}");
  const [producerInit, setProducerInit] = useState<ProducerInit>({
    isReady: false,
    isLoading: false,
    initFailed: false
  });
  const {notifyError, notifySuccess} = Notifications.useContext();
  const {producerServiceClient} = GrpcClient.useContext();
  const sendMessage = useCallback(async () => {
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

    const res = await producerServiceClient.send(sendReq, {})
      .catch(err => notifyError(`Unable to send a message. ${err}`));

    if (res === undefined) {
      return;
    }
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to send a message. ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(`Message successfully sent`, nanoid(), true);
  }, [value, valueType, key, eventTime, propertiesJsonMap]);

  const initializeProducer = useCallback(async () => {
    if (props.preset.topic === undefined) {
      return;
    }

    const createProducerReq: CreateProducerRequest = new CreateProducerRequest();
    createProducerReq.setProducerName(producerName.current);
    createProducerReq.setTopic(props.preset.topic);
    const res = await producerServiceClient.createProducer(createProducerReq, {}).catch(err => notifyError(`Unable to create producer ${producerName.current}: ${err}`));

    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      setProducerInit(() => ({isReady: false, isLoading: false, initFailed: true}));
      notifyError(`Unable to create producer ${producerName.current}: ${res.getStatus()?.getMessage()}`);
      return Promise.reject();
    } else {
      setProducerInit(init => ({isReady: true, isLoading: false, initFailed: false}));
      return Promise.resolve();
    }
  }, [producerInit, props.preset.topic, producerName]);

  function withMaxDuration<T>(promise: Promise<T>, durationMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Creating producer timed out'));
      }, durationMs);

      promise.then(
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }

  const cleanup = useCallback(async (retryCount = 0) => {
    if (producerInit.isReady) {
      const deleteProducerRequest = new DeleteProducerRequest();
      deleteProducerRequest.setProducerName(producerName.current);
      const res = await producerServiceClient.deleteProducer(deleteProducerRequest, {});

      if (res.getStatus()?.getCode() !== Code.OK) {
        if (retryCount < 5) {
          setTimeout(() => cleanup(retryCount + 1), 1000);
        } else {
          notifyError(`Unable to delete producer ${producerName.current}: ${res.getStatus()?.getMessage()}`);
        }
      }
    }
  }, [producerName, producerInit.isReady]);

  useEffect(() => {
    window.addEventListener('beforeunload', () => {
      cleanup();
    });

    return () => {
      cleanup();
      window.addEventListener('beforeunload', () => {
        cleanup();
      });

    }
  }, [producerInit.isReady]);

  const changePropertiesJsonMap = async (v: string) => {
    await setPropertiesJsonMap(v || "")
  }

  const handleMessageSend = useCallback(async () => {
    if (!producerInit.isReady && !producerInit.isLoading) {
      setProducerInit({isReady: false, isLoading: true, initFailed: false});

      try {
        await withMaxDuration<void>(initializeProducer(), 10000);
        setProducerInit(prevInit => ({...prevInit, isLoading: false, isReady: true}));
        sendMessage();
      } catch (error) {
        setProducerInit(prevInit => ({...prevInit, isLoading: false, initFailed: true}));
      } finally {
        setProducerInit(init => ({...init, isLoading: false}));
      }
    } else if (producerInit.isReady) {
      sendMessage();
    }
  }, [initializeProducer, sendMessage]);


  return (
    <>
      <div
        className={s.Producer}
        onKeyDown={e => {
          if (e.ctrlKey && e.key === 'Enter') {
            handleMessageSend();
          }
        }}
      >
        <div className={s.Content}>
          <div className={s.Presets}>
          </div>

          <div className={s.Config}>
            <div className={s.ConfigLeft}>
              <div className={s.UpperGroup}>
                <div className={s.ValueFormControl}>
                  <strong>Value encoding</strong>
                  <Select<ValueType>
                    value={valueType}
                    onChange={v => setValueType(v as ValueType)}
                    list={[
                      {type: 'item', title: 'JSON', value: 'json'},
                      {type: 'item', title: 'Bytes (hex)', value: 'bytes-hex'},
                    ]}
                  />
                </div>
                <div className={s.DateFormControl}>
                  <strong>Event time</strong>
                  <DatetimePicker
                    value={eventTime}
                    onChange={v => setEventTime(v)}
                    clearable
                  />
                </div>
              </div>
              <div className={s.FormControl}>
                <strong>Key</strong>
                <Input onChange={v => setKey(v)} value={key || ''} placeholder=""/>
              </div>
              <div className={s.FormControl}>
                <strong>Properties</strong>
                <KeyValueEditor
                  value={JSON.parse(propertiesJsonMap)}
                  onChange={v => changePropertiesJsonMap(JSON.stringify(v) || '')}
                  height="200rem"
                  className={s.PropertiesEditor}
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
                    height="280rem"
                  />
                )}
                {valueType === 'bytes-hex' && (
                  <CodeEditor
                    value={value}
                    onChange={v => setValue(v || '')}
                    height="280rem"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className={s.Toolbar}>
          <div className={s.ToolbarControl}>
            <Button
              onClick={handleMessageSend}
              type='primary'
              svgIcon={sendIcon}
              text="Send"
              size='small'
            />
            {producerInit.isLoading && (
              <div className={s.ToolbarLoader}>
                <ClipLoader
                  color={"#000000"}
                  loading={true}
                  size={18}
                  className={s.ToolbarSpinner}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
                <div>
                  Awaiting for producer initialization...
                </div>
              </div>
            )}
            {producerInit.isReady && (
              <div className={s.ToolbarLoader}>
                <SvgIcon svg={doneIcon} className={s.DoneIcon}/>
                <div>
                  Producer is ready
                </div>
              </div>
            )}
            {producerInit.initFailed && (
              <div className={s.ToolbarLoader}>
                <SvgIcon svg={closeIcon} className={s.CloseIcon}/>
                <div>
                  Error while initializing producer. Please try again.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>

  );

}

export default Producer;
