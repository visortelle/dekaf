import _ from 'lodash';

import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { Configurations } from '../Sources/configurationsFields/configurationsFields';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { ConsumerCryptoFailureAction, ProcessingGuarantees, ProducerCryptoFailureAction } from '../Sinks/configurationsFields/configurationsFields';

export type UpdateSourceProps = {
  tenant: string,
  namespace: string,
  action: 'edit' | 'create',
  configurations: Configurations
}

const consumerCryptoFailureActionToPb = (value: ConsumerCryptoFailureAction): pb.ConsumerCryptoFailureAction => {
  switch (value) {
    case 'fail':
      return pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_FAIL;
    case 'discard':
      return pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_DISCARD;
    case 'consume':
      return pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_CONSUME;
  }
}

const producerCryptoFailureActionToPb = (value: ProducerCryptoFailureAction): pb.ProducerCryptoFailureAction => {
  switch (value) {
    case 'fail':
      return pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_FAIL;
    case 'send':
      return pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_SEND;
  }
}

const processingGuaranteesToPb = (value: ProcessingGuarantees): pb.ProcessingGuarantees => {
  switch (value) {
    case 'atleast_once':
      return pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATLEAST_ONCE;
    case 'atmost_once':
      return pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATMOST_ONCE;
    case 'effectively_once':
      return pb.ProcessingGuarantees.PROCESSING_GUARANTEES_EFFECTIVELY_ONCE;
  }
}

const updateSource = async (props: UpdateSourceProps) => {
  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const req = props.action === 'create' ? new pb.CreateSourceRequest() : new pb.UpdateSourceRequest();
  const source = new pb.Source();
  source.setTenant(props.tenant);
  source.setNamespace(props.namespace);
  source.setName(props.configurations.name);
  source.setClassName(props.configurations.className);
  source.setTopicName(props.configurations.topicName);

  const producerConfig = new pb.ProducerConfig();
  producerConfig.setMaxPendingMessages(props.configurations.producerConfig.maxPendingMessages);
  producerConfig.setMaxPendingMessagesAcrossPartitions(props.configurations.producerConfig.maxPendingMessagesAcrossPartitions);
  producerConfig.setUseThreadLocalProducers(props.configurations.producerConfig.useThreadLocalProducers);
  
  const cryptoConfig = new pb.CryptoConfig();
  cryptoConfig.setCryptoKeyReaderClassName(props.configurations.producerConfig.cryptoConfig.cryptoKeyReaderClassName);
  cryptoConfig.setCryptoKeyReaderConfig(props.configurations.producerConfig.cryptoConfig.cryptoKeyReaderConfig);
  cryptoConfig.setEncryptionKeysList(props.configurations.producerConfig.cryptoConfig.encryptionKeys);
  cryptoConfig.setProducerCryptoFailureAction(producerCryptoFailureActionToPb(props.configurations.producerConfig.cryptoConfig.producerCryptoFailureAction));
  cryptoConfig.setConsumerCryptoFailureAction(consumerCryptoFailureActionToPb(props.configurations.producerConfig.cryptoConfig.consumerCryptoFailureAction));
  
  producerConfig.setCryptoConfig(cryptoConfig);
  producerConfig.setBatchBuilder(props.configurations.producerConfig.batchBuider);
  source.setProducerConfig(producerConfig);
  source.setSerdeClassName(props.configurations.serdeClassName);
  source.setSchemaType(props.configurations.schemaType);
  source.setConfigs(JSON.stringify(props.configurations.configs));
  source.setSecrets(JSON.stringify(props.configurations.secrets));
  source.setParallelism(props.configurations.parallelism);
  source.setProcessingGuarantees(processingGuaranteesToPb(props.configurations.processingGuarantees));
  
  const resources = new pb.Resources();
  resources.setCpu(props.configurations.resources.cpu);
  resources.setDisk(props.configurations.resources.disk);
  resources.setRam(props.configurations.resources.ram);

  source.setResources();
  source.setArchive(props.configurations.archive);
  source.setRuntimeFlags(props.configurations.runtimeFlags);
  source.setCustomRuntimeOptions(props.configurations.customRuntimeOptions);
  
  const batchSourceConfig = new pb.BatchSourceConfig();
  batchSourceConfig.setBatchsourceConfigKey(props.configurations.batchSourceConfig.batchsourceConfigKey);
  batchSourceConfig.setBatchsourceClassnameKey(props.configurations.batchSourceConfig.batchsourceClassnameKey);
  batchSourceConfig.setDiscoveryTriggererClassName(props.configurations.batchSourceConfig.discoveryTriggererClassName);
  batchSourceConfig.setDiscoveryTriggererConfig(props.configurations.batchSourceConfig.discoveryTriggererConfig);

  source.setBatchSourceConfig(batchSourceConfig);
  source.setBatchBuilder(props.configurations.batchBuilder);

  req.setSource(source);

  const res = props.action === 'create' ? await ioServiceClient.createSource(req, {}) : await ioServiceClient.updateSource(req, {});
  if (res.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to ${props.action} sink. ${res.getStatus()?.getMessage()}`);
    return;
  }
}

export default updateSource;