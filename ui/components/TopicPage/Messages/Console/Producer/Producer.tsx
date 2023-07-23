<<<<<<< HEAD
import React, {useCallback, useEffect, useState} from 'react';
=======
import React, {useCallback, useEffect} from 'react';
>>>>>>> 745effa6 (Small fixes)
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
import startIcon from './icons/start.svg';
import restartIcon from './icons/restart.svg';

import s from './Producer.module.css';
import {ValueType} from './types';
import {valueToBytes} from './lib/lib';
import {ProgressBar} from "react-loader-spinner";

export type ProducerPreset = {
  topic: string | undefined;
  key: string;
}

export type ProducerProps = {
  preset: ProducerPreset;
};

type ProducerInit = {
  isStarted: boolean,
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
    isStarted: false,
    isLoading: false,
    initFailed: false
  });
  const {notifyError, notifySuccess} = Notifications.useContext();
  const {producerServiceClient} = GrpcClient.useContext();

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
  }

  const initializeProducer = async () => {
    if (props.preset.topic === undefined) {
      return;
    }

    const createProducerReq: CreateProducerRequest = new CreateProducerRequest();
    createProducerReq.setProducerName(producerName.current);
    createProducerReq.setTopic(props.preset.topic);
    const res = await producerServiceClient.createProducer(createProducerReq, {}).catch(err => notifyError(`Unable to create producer ${producerName.current}: ${err}`));

    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      setProducerInit(() => ({isStarted: false, isLoading: false, initFailed: true}));
      notifyError(`Unable to create producer ${producerName.current}: ${res.getStatus()?.getMessage()}`);
    } else {
      setProducerInit(producerInit => ({...producerInit, isLoading: false, isStarted: true}));
    }
  }

  const cleanup = useCallback(async (retryCount = 0) => {
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
  }, [producerName]);

  useEffect(() => {
    if (producerInit.isStarted) {
      window.addEventListener('beforeunload', () => {
        cleanup();
      });

      return () => {
        cleanup();
        window.addEventListener('beforeunload', () => {
          cleanup();
        });

      }
    }
  }, [producerInit.isStarted]);

  useEffect(() => {
    if (producerInit.isLoading) {
      (async () => {
        await withTimeout<void>(initializeProducer(), 10000);
      })();
    }
  }, [producerInit.isLoading]);

  const changePropertiesJsonMap = async (v: string) => {
    await setPropertiesJsonMap(v || "")
  }

  function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Creating producer timed out'));
      }, timeoutMs);

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

  return (
    <>
      {(!producerInit.isStarted && !producerInit.isLoading && !producerInit.initFailed) && (
        <div
          className={s.Producer}
          onKeyDown={async e => {
            if (e.ctrlKey && e.key === 'Enter') {
              setProducerInit(producerInit => ({...producerInit, isLoading: true}));
            }
          }}
        >

          <Button
            onClick={() => setProducerInit(producerInit => ({...producerInit, isLoading: true}))}
            svgIcon={startIcon}
            type={"primary"}
            text={"Start producer"}
            buttonProps={{
              style: {width: "fit-content", margin: "12rem"}
            }}
          />
        </div>
        )}
      {producerInit.isLoading && (
          <div className={s.NoDataToShow}>
            Awaiting for producer initialization...
          </div>
        )
      }
      {producerInit.initFailed &&
        <div
          className={s.Producer}
          onKeyDown={async e => {
            if (e.ctrlKey && e.key === 'Enter') {
              setProducerInit(producerInit => ({...producerInit, isLoading: true, initFailed: false}));
            }
          }}
        >
          <div className={s.NoDataToShow}>
            There was some problem with starting the producer :(
          </div>
          <Button
            onClick={() => {
              setProducerInit(producerInit => ({...producerInit, isLoading: true, initFailed: false}));
            }}
            svgIcon={restartIcon}
            type={"primary"}
            text={"Start producer again"}
            buttonProps={{
              style: {width: "fit-content", margin: "12rem"}
            }}
          />
        </div>
      }
      {producerInit.isStarted && (
          <div
            className={s.Producer}
            onKeyDown={e => {
              if (e.ctrlKey && e.key === 'Enter') {
                sendMessage();
              }
            }}
          >
            <div className={s.Content}>
              <div className={s.Presets}>
              </div>

              <div className={s.Config}>
                <div className={s.ConfigLeft}>
                  <div className={s.FormControl}>
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
                  <div className={s.FormControl}>
                    <strong>Key</strong>
                    <Input onChange={v => setKey(v)} value={key || ''} placeholder=""/>
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
                      value={JSON.parse(propertiesJsonMap)}
                      onChange={v => changePropertiesJsonMap(JSON.stringify(v) || '')}
                      height="320rem"
                    />
                  </div>

                  <div style={{height: '24rem'}}>
                    {/* There is some HTML/CSS mess I can't quickly figure out.
              It's just a hack to make bottom padding work correctly. */}
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
                        height="480rem"
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
                <ProgressBar
                  height="80"
                  width="80"
                  ariaLabel="progress-bar-loading"
                  wrapperStyle={{}}
                  wrapperClass="progress-bar-wrapper"
                  borderColor=''
                  barColor='#51E5FF'
                />
              </div>
            </div>
          </div>
        )
      }
    </>

  );

}

export default Producer;
