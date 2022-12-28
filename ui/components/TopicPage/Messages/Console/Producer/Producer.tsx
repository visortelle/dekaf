import React, { useCallback, useEffect, useState } from 'react';
import { isPlainObject } from 'lodash';
import { Buffer } from 'buffer';
import { nanoid } from 'nanoid';
import * as Either from 'fp-ts/lib/Either';

import Button from '../../../../ui/Button/Button';
import Input from '../../../../ui/Input/Input';
import Select from '../../../../ui/Select/Select';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { CreateProducerRequest, DeleteProducerRequest, MessageFormat, ProducerMessage, SendRequest } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/producer_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';
import KeyValueEditor from '../../../../ui/KeyValueEditor/KeyValueEditor';



import { Monaco } from '@monaco-editor/react';
import { IRange } from 'monaco-editor';

import sendIcon from './icons/send.svg';

import s from './Producer.module.css'

export type ProducerPreset = {
  topic: string | undefined;
  key: string;
}

type ValueType = 'bytes-hex' | 'json';

export type ProducerProps = {
  preset: ProducerPreset
};

const Producer: React.FC<ProducerProps> = (props) => {
  const [key, setKey] = React.useState<string>(props.preset.key);
  const [valueType, setValueType] = React.useState<ValueType>('json');
  const [value, setValue] = React.useState<string>('');
  const [producerName, setProducerName] = React.useState<string>(`__xray_prod_` + nanoid());
  const [eventTime, setEventTime] = React.useState<Date | undefined>(undefined);
  const [propertiesJsonMap, setPropertiesJsonMap] = React.useState<string>("{}");
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { producerServiceClient } = PulsarGrpcClient.useContext();

  const sendMessage = async () => {
    const sendReq: SendRequest = new SendRequest();
    sendReq.setProducerName(producerName);

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
    deleteProducerRequest.setProducerName(producerName);
    const res = await producerServiceClient.deleteProducer(deleteProducerRequest, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to delete producer ${producerName}: ${res.getStatus()?.getMessage()}`);
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
    createProducerReq.setProducerName(producerName);
    createProducerReq.setTopic(props.preset.topic);
    const res = await producerServiceClient.createProducer(createProducerReq, {}).catch(err => notifyError(`Unable to create producer ${producerName}: ${err}`));

    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create producer ${producerName}: ${res.getStatus()?.getMessage()}`);
    }
  }

  const changePropertiesJsonMap = async (v: string) => {
    await setPropertiesJsonMap(v || "")
  }




  // const [monaco, setMonaco] = useState<Monaco | null>(null);

  // useEffect(() => {

  //   console.log("I'm working 2 =)")

  //   if (!monaco) {
  //     return
  //   }

  //   const createDependencyProposals = (range: IRange) => {
  //     return [
  //       {
  //         label: 'properties',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'properties()',
  //         range: range
  //       },
  //       {
  //         label: 'eventTime',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'eventTime()',
  //         range: range
  //       },
  //       {
  //         label: 'publishTime',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'publishTime()',
  //         range: range
  //       },
  //       {
  //         label: 'brokerPublishTime',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'brokerPublishTime()',
  //         range: range
  //       },
  //       {
  //         label: 'messageId',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'messageId()',
  //         range: range
  //       },
  //       {
  //         label: 'sequenceId',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'sequenceId()',
  //         range: range
  //       },
  //       {
  //         label: 'producerName',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'producerName()',
  //         range: range
  //       },
  //       {
  //         label: 'key',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'key()',
  //         range: range
  //       },
  //       {
  //         label: 'orderingKey',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'orderingKey()',
  //         range: range
  //       },
  //       {
  //         label: 'topic',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'topic()',
  //         range: range
  //       },
  //       {
  //         label: 'size',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'size()',
  //         range: range
  //       },
  //       {
  //         label: 'redeliveryCount',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'redeliveryCount()',
  //         range: range
  //       },
  //       {
  //         label: 'schemaVersion',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'schemaVersion()',
  //         range: range
  //       },
  //       {
  //         label: 'isReplicated',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'isReplicated()',
  //         range: range
  //       },
  //       {
  //         label: 'replicatedFrom',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'replicatedFrom()',
  //         range: range
  //       },
  //     ];
  //   }
    
  //   monaco.languages.typescript.javascriptDefaults.setCompilerOptions({})

  //   monaco.languages.registerCompletionItemProvider('javascript', {
  //     provideCompletionItems: function (model, position) {
    
  //       const textUntilPosition = model.getValueInRange({
  //         startLineNumber: 1,
  //         startColumn: 1,
  //         endLineNumber: position.lineNumber,
  //         endColumn: position.column
  //       })
  //       const match = textUntilPosition.match(
  //         /msg.*/
  //       )
  //       if (!match) {
  //         return { suggestions: [] };
  //       }
  //       const word = model.getWordUntilPosition(position);
  //       const range = {
  //         startLineNumber: position.lineNumber,
  //         endLineNumber: position.lineNumber,
  //         startColumn: word.startColumn,
  //         endColumn: word.endColumn
  //       }
  //       return {
  //         suggestions: createDependencyProposals(range)
  //       }
  //     },
      
  //   });

  // }, [monaco])


  // const fullMonaco = (monaco: Monaco) => {
  //   setMonaco(monaco)
  // }





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
                  { type: 'item', title: 'JSON', value: 'json' },
                  { type: 'item', title: 'Bytes (hex)', value: 'bytes-hex' },
                ]}
              />
            </div>
            <div className={s.FormControl}>
              <strong>Key</strong>
              <Input onChange={v => setKey(v)} value={key || ''} placeholder="" />
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

            <div style={{ height: '24rem' }}>
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
                  // fullMonaco={fullMonaco}
                />
              )}
              {valueType === 'bytes-hex' && (
                <CodeEditor
                  value={value}
                  onChange={v => setValue(v || '')}
                  height="480rem"
                  // fullMonaco={fullMonaco}
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

function valueToBytes(value: string, valueType: ValueType): Either.Either<Error, Uint8Array> {
  switch (valueType) {
    case 'json': {
      let validationError: Error | undefined = undefined;
      try {
        JSON.parse(value);
      } catch (err) {
        validationError = err as Error;
      }

      if (validationError !== undefined) {
        return Either.left(validationError);
      }

      const bytes = Uint8Array.from(Buffer.from(value))
      return Either.right(bytes);
    };
    case 'bytes-hex': {
      const bytes = Uint8Array.from(Buffer.from(value.replace(/\s/g, ''), 'hex'))
      return Either.right(bytes);
    };
  }
}

export default Producer;
