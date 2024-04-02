import React from 'react';
import Button from '../../../../Button/Button';
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import { Int64Value } from 'google-protobuf/google/protobuf/wrappers_pb';

export type TestButtonProps = {};

const TestButton: React.FC<TestButtonProps> = (props) => {
  const { producerServiceClient } = GrpcClient.useContext();

  const run = async () => {
    const req = new pb.CreateProducerSessionRequest();
    req.setSessionId('test-session-id');

    const conf = new pb.ProducerSessionConfig();

    const task = new pb.ProducerSessionTask();

    const producerTask = new pb.ProducerTask();
    producerTask.setTargetTopicFqn('persistent://public/default/abc');

    const messageGenerator = new pb.MessageGenerator();
    const valueGenerator = new pb.ValueGenerator();

    const jsonGenerator = new pb.JsonGenerator();
    // const fixedJsonGenerator = new pb.FixedJsonGenerator();
    // fixedJsonGenerator.setJson('{"key": "value", "b": 2}');
    // jsonGenerator.setGeneratorFixed(fixedJsonGenerator);

    const jsJsonGenerator = new pb.JsJsonGenerator();
    jsJsonGenerator.setJsCode('() => ({ a: libs.faker.lorem.lines() })');
    jsonGenerator.setGeneratorJs(jsJsonGenerator);

    valueGenerator.setGeneratorFromJson(jsonGenerator);

    messageGenerator.setValueGenerator(valueGenerator);

    producerTask.setMessageGenerator(messageGenerator);

    const producerConf = new pb.PulsarProducerConfig();
    producerConf.setAccessMode(pb.AccessMode.ACCESS_MODE_SHARED);
    producerConf.setMaxPendingMessages(new Int64Value().setValue(10));

    producerTask.setProducerConfig(producerConf);
    producerTask.setNumMessages(new Int64Value().setValue(15));
    // producerTask.setIntervalNanos(new Int64Value().setValue(1000_000_000 * 3));
    producerTask.setIntervalNanos(new Int64Value().setValue(1));

    task.setTaskProducer(producerTask);

    // TASK 2 START
    const task2 = new pb.ProducerSessionTask();

    const producerTask2 = new pb.ProducerTask();
    producerTask2.setTargetTopicFqn('persistent://public/default/abc');

    const messageGenerator2 = new pb.MessageGenerator();
    const valueGenerator2 = new pb.ValueGenerator();

    const jsonGenerator2 = new pb.JsonGenerator();
    // const fixedJsonGenerator = new pb.FixedJsonGenerator();
    // fixedJsonGenerator.setJson('{"key": "value", "b": 2}');
    // jsonGenerator.setGeneratorFixed(fixedJsonGenerator);

    const jsJsonGenerator2 = new pb.JsJsonGenerator();
    jsJsonGenerator2.setJsCode('() => ({ b: 2 })');
    jsonGenerator2.setGeneratorJs(jsJsonGenerator2);

    valueGenerator2.setGeneratorFromJson(jsonGenerator2);

    messageGenerator2.setValueGenerator(valueGenerator2);

    producerTask2.setMessageGenerator(messageGenerator2);

    const producerConf2 = new pb.PulsarProducerConfig();
    producerConf2.setAccessMode(pb.AccessMode.ACCESS_MODE_SHARED);
    producerConf2.setMaxPendingMessages(new Int64Value().setValue(10));

    producerTask2.setProducerConfig(producerConf2);
    producerTask2.setNumMessages(new Int64Value().setValue(3));
    producerTask2.setIntervalNanos(new Int64Value().setValue(1000_000_000 * 3));
    // producerTask2.setIntervalNanos(new Int64Value().setValue(1));

    task2.setTaskProducer(producerTask2);
    // TASK 2 END

    conf.setTasksList([task, task2]);

    req.setSessionConfig(conf);

    const res = await producerServiceClient.createProducerSession(req, null).catch((err) => {
      console.error('Failed to create producer session', err);
    });

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      console.error('Failed to create producer session', res);
      return;
    }

    const resumeReq = new pb.ResumeProducerSessionRequest();
    resumeReq.setSessionId('test-session-id');

    const resumeRes = await producerServiceClient.resumeProducerSession(resumeReq, null).catch((err) => {
      console.error('Failed to resume producer session', err);
    });

    if (resumeRes === undefined) {
      return;
    }

    if (resumeRes.getStatus()?.getCode() !== Code.OK) {
      console.error('Failed to resume producer session', resumeRes);
      return;
    }
  };

  return (
    <div>
      <Button
        type='primary'
        text='Test'
        onClick={() => {
          run();
        }}
      />
    </div>
  );
}

export default TestButton;
