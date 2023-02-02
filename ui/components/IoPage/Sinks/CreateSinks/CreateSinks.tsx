import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';

import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { H3 } from '../../../ui/H/H';
import Button from '../../../ui/Button/Button';
import IoConfigField from '../../IoConfigField/IoConfigField';
import { configurationsFields, configurations as defaultConfigurations, Configurations, ConfigurationValue, ConsumerCryptoFailureAction, SubscriptionInitialPosition, ProducerCryptoFailureAction, ProcessingGuarantees, StringMap, StringMapItem } from '../configurationsFields';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

import s from './CreateSinks.module.css';

const CreateSinks = () => {

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

  const sourceSubscriptionPositionToPb = (value: SubscriptionInitialPosition): pb.SubscriptionInitialPosition => {
    switch (value) {
      case 'earliest':
        return pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST;
      case 'latest':
        return pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST;
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

  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const [configurations, setConfigurations] = useState(defaultConfigurations);

  const onChange = (configurations: Configurations) => {
    setConfigurations(configurations)
  }

  const expandMap = (key: string) => {

    if (key === 'inputsSpecs') {
      const newMap =  _.cloneDeep(configurations);
      const defaultdata = Object.keys(defaultConfigurations[key])[0]
      newMap[key] = {
        ...newMap[key],
        [uuid()]: defaultConfigurations[key][defaultdata]
      };
      setConfigurations(newMap);
    }
  }
  
  const changeMap = (configurationName: string, configurationKey: string, keyName: string, value: string | number | boolean | string[] | StringMap, attachmentName?: string) => {
    const newMap = _.cloneDeep(configurations);

    if (configurationName === 'inputsSpecs') {
      if (attachmentName) {
        const X = newMap[configurationName][configurationKey][keyName];
        if (
          typeof(X) === 'object' &&
          typeof(value) !== 'number' &&
          typeof(value) !== 'boolean' && 
          (
            (typeof(value) === 'object' && Array.isArray(value)) ||
            typeof(value) === 'string' ||
            Array.isArray(value)
          )
        ) {
          X[attachmentName] = value;
        }
      } else {
        if (!Array.isArray(value)) {
          newMap[configurationName][configurationKey][keyName] = value;
        }
      }
    }
    setConfigurations(newMap);
  }

  const changeAttachment = (configurationName: string, attachmentName: string, value: string | number | boolean | string[] | StringMap) => {
    const newAttachment = _.cloneDeep(configurations);

    if (configurationName === 'resources' && typeof(value) === 'number') {
      newAttachment[configurationName][attachmentName] = value;
    }
    
    onChange(newAttachment);
  }

  const createSink = async () => {
    const req = new pb.CreateSinkRequest();
    const sinkConfig = new pb.SinkConfig();
    sinkConfig.setTenant(configurations.tenant);
    sinkConfig.setNamespace(configurations.namespace);
    sinkConfig.setName(configurations.name);
    sinkConfig.setClassName(configurations.className);
    sinkConfig.setSourceSubscriptionName(configurations.sourceSubscriptionName);

    sinkConfig.setSourceSubscriptionPosition(sourceSubscriptionPositionToPb(configurations.sourceSubscriptionPosition));
    sinkConfig.setInputsList(configurations.inputs);

    Object.entries(configurations.topicToSerdeClassName).map(([_, value]) => {
      sinkConfig.getTopicToSerdeClassNameMap().set(value.name, value.value);
    });

    sinkConfig.setTopicsPattern(configurations.topicsPattern);

    Object.entries(configurations.topicToSchemaType).map(([_, value]) => {
      sinkConfig.getTopicToSchemaTypeMap().set(value.name, value.value);
    });

    Object.entries(configurations.topicToSchemaProperties).map(([_, value]) => {
      sinkConfig.getTopicToSchemaPropertiesMap().set(value.name, value.value);
    });

    Object.entries(configurations.inputsSpecs).map(([_, value]) => {
      const inputsSpecs = new pb.InputsSpecs();
      const cryptoConfig = new pb.CryptoConfig();
      cryptoConfig.setConsumerCryptoFailureAction(consumerCryptoFailureActionToPb(value.cryptoConfig.consumerCryptoFailureAction));
      cryptoConfig.setCryptoKeyReaderClassName(value.cryptoConfig.cryptoKeyReaderClassName);
      cryptoConfig.setCryptoKeyReaderConfig(value.cryptoConfig.cryptoKeyReaderConfig);
      cryptoConfig.setEncryptionKeysList(value.cryptoConfig.encryptionKeys);
      cryptoConfig.setProducerCryptoFailureAction(producerCryptoFailureActionToPb(value.cryptoConfig.producerCryptoFailureAction));

      inputsSpecs.setCryptoConfig(cryptoConfig);
      inputsSpecs.setIsRegexPattern(value.isRegexPattern);
      inputsSpecs.setPoolMessages(value.poolMessages);
      inputsSpecs.setReceiverQueueSize(value.receiverQueueSize);
      inputsSpecs.setSchemaType(value.schemaType);
      inputsSpecs.setSerdeClassName(value.serdeClassName);

      Object.entries(value.schemaProperties).map(([_, value]) => {
        inputsSpecs.getSchemaPropertiesMap().set(value.name, value.value)
      })

      Object.entries(value.consumerProperties).map(([_, value]) => {
        inputsSpecs.getConsumerPropertiesMap().set(value.name, value.value)
      })

      sinkConfig.getInputSpecsMap().set(value.name, inputsSpecs)
    })
    
    sinkConfig.setMaxMessageRetries(configurations.maxMessageRetries);
    sinkConfig.setDeadLetterTopic(configurations.deadLetterTopic);
    sinkConfig.setConfigs(configurations.configs);
    sinkConfig.setSecrets(configurations.secrets);
    sinkConfig.setParallelism(configurations.parallelism);

    sinkConfig.setProcessingGuarantees(processingGuaranteesToPb(configurations.processingGuarantees));
    sinkConfig.setRetainOrdering(configurations.retainOrdering);
    sinkConfig.setRetainKeyOrdering(configurations.retainKeyOrdering);

    const resources = new pb.Resources();
    resources.setCpu(configurations.resources.cpu);
    resources.setDisk(configurations.resources.disk);
    resources.setRam(configurations.resources.ram);

    sinkConfig.setResources(resources);
    sinkConfig.setAutoAck(configurations.autoAck);
    sinkConfig.setTimeoutMs(configurations.timeoutMs);
    sinkConfig.setNegativeAckRedeliveryDelayMs(configurations.negativeAckRedeliveryDelayMs);
    sinkConfig.setArchive(configurations.archive);
    sinkConfig.setCleanupSubscription(configurations.cleanupSubscription);
    sinkConfig.setRuntimeFlags(configurations.runtimeFlags);
    sinkConfig.setCustomRuntimeOptions(configurations.customRuntimeOptions);

    req.setSinkConfig(sinkConfig);
    req.setFileName("sinks.json")

    const res = await ioServiceClient.createSink(req, {});
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create sink. ${res.getStatus()?.getMessage()}`);
      return;
    } else {
      console.log("created")
    }
  }

  return (
    <div>
      {configurationsFields.map(configuration => (
        <div key={configuration.name} className={`${s.CreateSinksField }`}>
          <H3>
            {configuration.name}
          </H3>

          {configuration.attachments &&
            <div>
              {configuration.attachments.map(attachment => {
                return (
                  <div key={attachment.name} className={s.CreateSinkInput}>
                    <IoConfigField
                      name={attachment.name}
                      isRequired={attachment.isRequired}
                      type={attachment.type}
                      help={attachment.help}
                      value={configurations[configuration.name][attachment.name as keyof ConfigurationValue]}
                      onChange={(v) => changeAttachment(configuration.name, attachment.name, v)}
                      configurations={configurations}
                      enum={attachment.enum}
                      mapType={attachment.mapType}
                    />
                  </div>
                )
              })}
            </div>
          }

          {!configuration.attachments && (configuration.type !== 'map' || typeof(configuration.mapType) === 'string') &&
            <div key={configuration.name} className={s.CreateSinkInput}>
              <IoConfigField
                name={configuration.name}
                isRequired={configuration.isRequired}
                type={configuration.type}
                help={configuration.help}
                value={configurations[configuration.name]}
                onChange={(v) => onChange({
                  ...configurations,
                  [configuration.name]: v
                })}
                configurations={configurations}
                enum={configuration.enum}
                mapType={configuration.mapType}
              />
            </div>
          }

          {configuration.type === 'map' && typeof(configuration.mapType) === 'object' &&
            <div className={s.CreateSinkInput}>
              <div onClick={() => expandMap(configuration.name)}>
                +Object map
              </div>
              {Object.keys(configurations[configuration.name]).map(configurationKey => (
                <div key={configurationKey}>
                  {configuration.mapType && configuration.mapType !== 'string' && configuration.mapType.map(key => (
                    <div key={key.name}>
                      <H3>
                        {key.name}
                      </H3>
                      {key.attachments &&
                        <div>
                          {key.attachments.map((attachment) => (
                            <div key={attachment.name} className={s.CreateSinkInput}>
                              <H3>
                                {attachment.name}
                              </H3>
                              <IoConfigField
                                name={attachment.name}
                                isRequired={attachment.isRequired}
                                type={attachment.type}
                                help={attachment.help}
                                value={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name][attachment.name]}
                                onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value, attachment.name)}
                                configurations={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name]}
                                enum={attachment.enum}
                                mapType={attachment.mapType}
                              />
                            </div>
                          ))}
                        </div>
                      }

                      {configuration.mapType && !key.attachments && (key.type !== 'map' || typeof(key.mapType) === 'string') &&
                        <div key={key.name} className={s.CreateSinkInput}>
                          <IoConfigField
                            name={key.name}
                            isRequired={key.isRequired}
                            type={key.type}
                            help={key.help}
                            value={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name]}
                            onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value)}
                            configurations={configurations[configuration.name][configurationKey as keyof ConfigurationValue]}
                            enum={key.enum}
                            mapType={key.mapType}
                          />
                        </div>
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>
          }
        </div>
      ))}

      <Button
        text='send'
        onClick={() => createSink()}
        type='primary'
      />
    </div>
  )
}

export default CreateSinks;