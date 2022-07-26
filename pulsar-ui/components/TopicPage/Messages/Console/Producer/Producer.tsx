import React, { useCallback, useEffect } from 'react';
import Button from '../../../../ui/Button/Button';
import Input from '../../../../ui/Input/Input';
import s from './Producer.module.css'
import startIcon from '!!raw-loader!./icons/start.svg';
import stopIcon from '!!raw-loader!./icons/stop.svg';
import sendIcon from '!!raw-loader!./icons/send.svg';
import Select from '../../../../ui/Select/Select';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { nanoid } from 'nanoid';
import { CreateProducerRequest, DeleteProducerRequest, SendRequest } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/producer_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import * as I18n from '../../../../app/contexts/I18n/I18n';

export type ProducerPreset = {
  topic: string | undefined;
  key: string;
}

type ValueType = 'bytes-hex' | 'bytes-binary' | 'bytes-base64' | 'json' | 'utf-8-string';

export type ProducerProps = {
  preset: ProducerPreset
};

const Producer: React.FC<ProducerProps> = (props) => {
  const [topic, setTopic] = React.useState<string | undefined>(props.preset.topic);
  const [key, setKey] = React.useState<string>(props.preset.key);
  const [isStarted, setIsStarted] = React.useState<boolean>(false);
  const [valueType, setValueType] = React.useState<ValueType>('bytes-hex');
  const [value, setValue] = React.useState<string>('');
  const [producerName, setProducerName] = React.useState<string>(`__xray_prod_` + nanoid());
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { producerServiceClient } = PulsarGrpcClient.useContext();
  const i18n = I18n.useContext();

  const sendMessage = async () => {
    const sendReq: SendRequest = new SendRequest();
    sendReq.setProducerName(producerName);
    sendReq.setMessagesList([valueToBytes(value, valueType)]);

    const res = await producerServiceClient.send(sendReq, {}).catch(err => notifyError(`Unable to send a message. ${err}`));
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
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

  return (
    <div
      className={s.Producer}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      }}
    >
      <div className={s.Content}>
        <div className={s.Presets}>
        </div>

        <div className={s.Config}>
          <div className={s.FormControl}>
            <strong>Topic</strong>
            <Input onChange={v => setTopic(v)} value={topic || ''} placeholder="persistence://public/default" />
          </div>
          <div className={s.FormControl}>
            <strong>Key</strong>
            <Input onChange={v => setKey(v)} value={key || ''} placeholder="key-1" />
          </div>
        </div>

        <div className={s.Value}>
          <div className={s.FormControl}>
            <strong>Value type</strong>
            <Select<ValueType>
              value={valueType}
              onChange={v => setValueType(v as ValueType)}
              list={[
                { type: 'item', title: 'JSON', value: 'json' },
                { type: 'item', title: 'String (UTF-8)', value: 'utf-8-string' },
                { type: 'item', title: 'Bytes (hex)', value: 'bytes-hex' },
                { type: 'item', title: 'Bytes (binary)', value: 'bytes-binary' },
                { type: 'item', title: 'Bytes (base64)', value: 'bytes-base64' },
              ]}
            />
          </div>

          <div className={s.FormControl}>
            <strong>Value</strong>
            <Input onChange={v => setValue(v)} value={value} placeholder="random string" />
          </div>
        </div>
      </div>
      <div className={s.Toolbar}>
        <div className={s.ToolbarControl}>
          <Button
            onClick={sendMessage}
            type='primary'
            svgIcon={sendIcon}
          />
        </div>
      </div>
    </div>
  );
}

function valueToBytes(value: string, valueType: ValueType): Uint8Array {
  switch (valueType) {
    case 'utf-8-string': return Uint8Array.from(Buffer.from(value));
    case 'json': return Uint8Array.from(Buffer.from(value));
    case 'bytes-hex': return Uint8Array.from(Buffer.from(value.replace(/\s/g, ''), 'hex'));
    case 'bytes-binary': return Uint8Array.from(Buffer.from(value.replace(/\s/g, ''), 'binary'));
    case 'bytes-base64': return Uint8Array.from(Buffer.from(value, 'base64'));
  }
}

export default Producer;
