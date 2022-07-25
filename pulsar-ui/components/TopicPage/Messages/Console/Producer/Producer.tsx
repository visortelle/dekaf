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

export type ProducerPreset = {
  topic: string | undefined;
  key: string;
}

type ValueType = 'bytes-hex' | 'json' | 'utf-8-string';

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
  const { notifyError } = Notifications.useContext();
  const { producerServiceClient } = PulsarGrpcClient.useContext();

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
    const res = await producerServiceClient.createProducer(createProducerReq, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create producer ${producerName}: ${res.getStatus()?.getMessage()}`);
    }
  }

  return (
    <div className={s.Producer}>
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
                { type: 'item', title: 'Bytes (hex)', value: 'bytes-hex' },
                { type: 'item', title: 'JSON', value: 'json' },
                { type: 'item', title: 'String (UTF-8)', value: 'utf-8-string' },
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
            onClick={async () => {
              const sendReq: SendRequest = new SendRequest();
              sendReq.setProducerName(producerName);
              sendReq.setMessagesList([
                valueToBytes(value, valueType)
              ]);
              await producerServiceClient.send(sendReq, {}).catch(err => notifyError(`Unable to send a message. ${err}`));
            }}
            type='primary'
            svgIcon={sendIcon}
          />
        </div>
        <div className={s.ToolbarControl}>
          <Button onClick={() => { }} type='primary' svgIcon={isStarted ? stopIcon : startIcon} />
        </div>
      </div>
    </div>
  );
}

function valueToBytes(value: string, valueType: ValueType): Uint8Array {
  switch (valueType) {
    case 'utf-8-string': {
      return Uint8Array.from(Buffer.from(value));
    }
    default: return Uint8Array.from(Buffer.from(value, 'hex'));
  }
}

export default Producer;
