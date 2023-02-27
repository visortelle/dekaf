import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import { useNavigate } from 'react-router-dom';

import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import Button from '../../../../ui/Button/Button';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import { H1 } from '../../../../ui/H/H';
import IoConfigField from '../../IoConfigField/IoConfigField';
import { configurationsFields, configurations as defaultConfigurations, Configurations, ConfigurationValue, ConsumerCryptoFailureAction, SubscriptionInitialPosition, ProducerCryptoFailureAction, ProcessingGuarantees, StringMap, PathToConnectorType, PathToConnector, SinkType, ClassName, SINK_TYPE } from '../configurationsFields/configurationsFields';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { ElasticSearchSslConfigs } from '../configurationsFields/connectrosConfigs/connectors/elasticsearchConfigs';
import { ConnectorsConfigs } from '../configurationsFields/connectrosConfigs/configs';
import deleteIcon from '../../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/delete.svg';
import enableIcon from '../../../../TopicPage/Messages/SessionConfiguration/MessageFilterInput/icons/enable.svg';

import s from './UpdateSink.module.css';
import sl from '../../../../ui/ConfigurationTable/ListInput/ListInput.module.css';
import sf from '../../../../ui/ConfigurationTable/form.module.css';

type CreateSinkProps = {
  tenant: string,
  namespace: string,
  action: 'edit' | 'create',
  configurations: Configurations,
}

const UpdateSink = (props: CreateSinkProps) => {

  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const [configurations, setConfigurations] = useState(props.configurations);
  const [hideUnrequired, setHideUnrequired] = useState(true);

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

  const pathToConnectorToPb = (value: PathToConnectorType): pb.PathType => {
    switch (value) {
      case 'folder':
        return pb.PathType.PATH_TYPE_FOLDER;
      case 'url':
        return pb.PathType.PATH_TYPE_URL;
    }
  }

  const sinkTypeToPb = (value: SinkType): pb.SinkType => {
    switch (value) {
      case 'aerospike':
        return pb.SinkType.SINK_TYPE_AEROSPIKE;
      case 'alluxio':
        return pb.SinkType.SINK_TYPE_ALLUXIO;
      case 'cassandra':
        return pb.SinkType.SINK_TYPE_CASSANDRA;
      case 'elasticSearch':
        return pb.SinkType.SINK_TYPE_ELASTIC_SEARCH;
      case 'flume':
        return pb.SinkType.SINK_TYPE_FLUME;
      case 'hbase':
        return pb.SinkType.SINK_TYPE_HBASE;
      case 'hdfs2':
        return pb.SinkType.SINK_TYPE_HDFS2;
      case 'hdfs3':
        return pb.SinkType.SINK_TYPE_HDFS3;
      case 'http':
        return pb.SinkType.SINK_TYPE_HTTP;
      case 'influxdbv1':
        return pb.SinkType.SINK_TYPE_INFLUXDB_V1;
      case 'influxdbv2':
        return pb.SinkType.SINK_TYPE_INFLUXDB_V2;
      case 'jdbcClickHouse':
        return pb.SinkType.SINK_TYPE_JDBC_CLICK_HOUSE;
      case 'jdbcMariaDB':
        return pb.SinkType.SINK_TYPE_JDBC_MARIA_DB;
      case 'jdbcOpenMLDB':
        return pb.SinkType.SINK_TYPE_JDBC_OPEN_MLDB;
      case 'jdbcPostgres':
        return pb.SinkType.SINK_TYPE_JDBC_POSTRGRES;
      case 'jdbcSQLite':
        return pb.SinkType.SINK_TYPE_JDBC_SQLITE;
      case 'kafka':
        return pb.SinkType.SINK_TYPE_KAFKA;
      case 'kinesis':
        return pb.SinkType.SINK_TYPE_KINESIS;
      case 'mongodb':
        return pb.SinkType.SINK_TYPE_MONGODB;
      case 'rabbitMQ':
        return pb.SinkType.SINK_TYPE_RABBITMQ;
      case 'redis':
        return pb.SinkType.SINK_TYPE_REDIS;
      case 'solr':
        return pb.SinkType.SINK_TYPE_SOLR;
    }
  }

  const classNameToPb = (value: ClassName | undefined): pb.ClassName => {
    switch (value) {
      case 'AbstractHdfs2Connector':
        return pb.ClassName.CLASS_NAME_ABSTRACT_HDFS2_CONNECTOR;
      case 'AbstractHdfs3Connector':
        return pb.ClassName.CLASS_NAME_ABSTRACT_HDFS3_CONNECTOR;
      case 'AerospikeStringSink':
        return pb.ClassName.CLASS_NAME_AEROSPIKE_STRING_SINK;
      case 'AlluxioSink':
        return pb.ClassName.CLASS_NAME_ALLUXIO_SINK;
      case 'CassandraStringSink':
        return pb.ClassName.CLASS_NAME_CASSANDRA_STRING_SINK;
      case 'ClickHouseJdbcAutoSchemaSink':
        return pb.ClassName.CLASS_NAME_CLICK_HOUSE_JDBC_AUTO_SCHEMA_SINK;
      case 'ElasticSearchSink':
        return pb.ClassName.CLASS_NAME_ELASTIC_SEARCH_SINK;
      case 'HbaseAbstractConfig':
        return pb.ClassName.CLASS_NAME_HBASE_ABSTRACT_CONFIG;
      case 'HttpSink':
        return pb.ClassName.CLASS_NAME_HTTP_SINK;
      case 'InfluxDBGenericRecordSink':
        return pb.ClassName.CLASS_NAME_INFLUXDB_GENERIC_RECORD_SINK;
      case 'KafkaAbstractSink':
        return pb.ClassName.CLASS_NAME_KAFKA_ABSTRACT_SINK;
      case 'KinesisSink':
        return pb.ClassName.CLASS_NAME_KINESIS_SINK;
      case 'MariadbJdbcAutoSchemaSink':
        return pb.ClassName.CLASS_NAME_MARIADB_JDBC_AUTO_SCHEMA_SINK;
      case 'MongoSink':
        return pb.ClassName.CLASS_NAME_MONGO_SINK;
      case 'OpenMLDBJdbcAutoSchemaSink':
        return pb.ClassName.CLASS_NAME_OPEN_MLDB_JDBC_AUTO_SCHEMA_SINK;
      case 'PostgresJdbcAutoSchemaSink':
        return pb.ClassName.CLASS_NAME_POSTGRES_JDBC_AUTO_SCHEMA_SINK;
      case 'RabbitMQSink':
        return pb.ClassName.CLASS_NAME_RABBIT_MQ_SINK;
      case 'RedisAbstractConfig':
        return pb.ClassName.CLASS_NAME_REDIS_ABSTRACT_CONFIG;
      case 'SolrSinkConfig':
        return pb.ClassName.CLASS_NAME_SOLR_SINK_CONFIG;
      case 'SqliteJdbcAutoSchemaSink':
        return pb.ClassName.CLASS_NAME_SQLITE_JDBC_AUTO_SCHEMA_SINK;
      case 'StringSink':
        return pb.ClassName.CLASS_NAME_STRING_SINK;
      default:
        return pb.ClassName.CLASS_NAME_ABSTRACT_HDFS2_CONNECTOR;
    }
  }

  const onChange = (configurations: Configurations) => {
    setConfigurations(configurations);
  }

  const expandMap = (key: string) => {
    if (key === 'inputsSpecs') {
      const newMap =  _.cloneDeep(configurations);
      const defaultdata = Object.keys(defaultConfigurations[key])[0];
      newMap[key] = {
        ...newMap[key],
        [uuid()]: defaultConfigurations[key][defaultdata]
      };
      setConfigurations(newMap);
    }
  }

  const reduceMap = (key: string, index: string) => {
    if (key === 'inputsSpecs') {
      const newMap =  _.cloneDeep(configurations);
      delete newMap[key][index];
      setConfigurations(newMap);
    }
  }

  const isComplexString = (configurationValue: ConfigurationValue): configurationValue is string | string[] => {
    if (typeof(configurationValue) !== 'number' && typeof(configurationValue) !== 'boolean' && ((typeof(configurationValue) === 'object' && Array.isArray(configurationValue)) || typeof(configurationValue) === 'string' || Array.isArray(configurationValue))) {
      return true;
    }
    
    return false;
  }

  const isPathToConnector = (configurationValue: ConfigurationValue): configurationValue is PathToConnector => {
    if (typeof(configurationValue) === 'string' || typeof(configurationValue) === 'number' || typeof(configurationValue) === 'boolean' || Array.isArray(configurationValue)) {
      return false;
    }

    return configurationValue.path ? true : false;
  }
  
  const changeMap = (configurationName: string, configurationKey: string, keyName: string, value: string | number | boolean | string[] | StringMap | PathToConnector, attachmentName?: string) => {
    const newMap = _.cloneDeep(configurations);

    if (configurationName === 'inputsSpecs') {
      if (attachmentName) {
        const X = newMap[configurationName][configurationKey][keyName];
        if (typeof(X) === 'object' && isComplexString(value)) {
          X[attachmentName] = value;
        }
      } else {
        if (!Array.isArray(value) && !isPathToConnector(value)) {
          newMap[configurationName][configurationKey][keyName] = value;
        }
      }
    }
    setConfigurations(newMap);
  }

  const isElasticSearchSslConfigs = (value: string | number | boolean | StringMap | ElasticSearchSslConfigs): value is ElasticSearchSslConfigs => {
    if (typeof(value) === 'object') {
      return true;
    }
    return false;
  }

  const changeAttachment = (configurationName: string, attachmentName: string, value: string | number | boolean | string[] | StringMap | PathToConnector) => {
    const newAttachment = _.cloneDeep(configurations);

    if (configurationName === 'resources' && typeof(value) === 'number') {
      newAttachment[configurationName][attachmentName] = value;
    }
    onChange(newAttachment);
  }

  const changeConditionalAttachments = (configurationName: string, attachmentName: string, field: string, value: string | number | boolean | string[] | StringMap, nestedName?: string) => {
    const newAttachment = _.cloneDeep(configurations);

    if (configurationName === 'configs' && !Array.isArray(value)) {
      let attachment = newAttachment[configurationName][field][attachmentName];
      if (nestedName && isElasticSearchSslConfigs(attachment) && (typeof(value) === 'string' || typeof(value) === 'boolean')) {
        attachment[nestedName] = value;
      } else {
        attachment = value;
      }
      newAttachment[configurationName][field][attachmentName] = attachment;
      onChange(newAttachment);
    }
  }

  const updateSink = async () => {
    const req = props.action === 'create' ? new pb.CreateSinkRequest() : new pb.UpdateSinkRequest();
    const sinkConfig = new pb.SinkConfig();
    sinkConfig.setTenant(props.tenant);
    sinkConfig.setNamespace(props.namespace);
    sinkConfig.setName(configurations.name);
    sinkConfig.setClassName(classNameToPb(configurations.className));
    sinkConfig.setSourceSubscriptionName(configurations.sourceSubscriptionName);

    sinkConfig.setSourceSubscriptionPosition(sourceSubscriptionPositionToPb(configurations.sourceSubscriptionPosition));
    sinkConfig.setInputsList(configurations.inputs);

    Object.entries(configurations.topicToSerdeClassName).map(([key, value]) => {
      sinkConfig.getTopicToSerdeClassNameMap().set(key, value);
    });

    sinkConfig.setTopicsPattern(configurations.topicsPattern);

    Object.entries(configurations.topicToSchemaType).map(([key, value]) => {
      sinkConfig.getTopicToSchemaTypeMap().set(key, value);
    });

    Object.entries(configurations.topicToSchemaProperties).map(([key, value]) => {
      sinkConfig.getTopicToSchemaPropertiesMap().set(key, value);
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


      Object.entries(value.schemaProperties).map(([key, value]) => {
        inputsSpecs.getSchemaPropertiesMap().set(key, value);
      })

      Object.entries(value.consumerProperties).map(([key, value]) => {
        inputsSpecs.getConsumerPropertiesMap().set(key, value);
      })

      sinkConfig.getInputSpecsMap().set(value.name, inputsSpecs);
    })
    
    sinkConfig.setMaxMessageRetries(configurations.maxMessageRetries);
    sinkConfig.setDeadLetterTopic(configurations.deadLetterTopic);
    sinkConfig.setConfigs(JSON.stringify(configurations.configs[configurations.sinkType]));
    sinkConfig.setSecrets(configurations.secrets);
    sinkConfig.setParallelism(configurations.parallelism);
    sinkConfig.setSinkType(sinkTypeToPb(configurations.sinkType));

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

    const pathToConnector = new pb.PathToConnector();
    pathToConnector.setType(pathToConnectorToPb(configurations.pathToConnector.type))
    if (configurations.pathToConnector.type === 'url') {
      pathToConnector.setPath(`https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-${configurations.pathToConnector.path}-2.11.0.nar`); 
    } else {
      pathToConnector.setPath(configurations.pathToConnector.path);
    }
    sinkConfig.setPathToConnector(pathToConnector);

    req.setSinkConfig(sinkConfig);

    const res = props.action === 'create' ? await ioServiceClient.createSink(req, {}) : await ioServiceClient.updateSink(req, {});
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to ${props.action} sink. ${res.getStatus()?.getMessage()}`);
      return;
    }
  }

  const isConnectorsConfigs = (value: ConfigurationValue): value is ConnectorsConfigs => {
    if (typeof(value) === 'object' && !Array.isArray(value) && value.hasOwnProperty('aerospike')) {
      return true;
    }
    return false;
  }

  return (
    <div className={`${s.UpdateSink}`}>
      <div className={s.Title}>
        <H1>
          {props.action === 'create' && <>Create sink</>}
          {props.action === 'edit' && 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              Update sink
              <Button
                buttonProps={{ type: 'submit' }}
                text='Delete'
                type='danger'
                onClick={() => modals.push({
                  id: 'delete-resource-group',
                  title: `Delete resource group`,
                  content: 
                    <DeleteDialog
                      tenant={props.tenant}
                      namespace={props.namespace}
                      sink={props.configurations.name}
                      navigate={navigate}
                    />,
                  styleMode: 'no-content-padding'
                })}
              />
            </div>
          }
        </H1>
      </div>

      {configurationsFields.map(configuration => (
        <FormItem key={configuration.name}>
          <div key={configuration.name} className={`${s.Field} ${(hideUnrequired && !configuration.isRequired) && s.HideUnrequired}`}>
            {props.action === 'edit' && configuration.name !== 'pathToConnector' &&
              <>
                <div className={s.Label}>
                  <FormLabel
                    content={configuration.label}
                    isRequired={configuration.isRequired}
                  />
                  <div className={s.EntryButton}>
                    <Button
                      svgIcon={enableIcon}
                      onClick={() => {}}
                      title='help information'
                      type='primary'
                    />
                    <span className={`${s.HelpInformation}`}>
                      {configuration.help}
                    </span>
                  </div>
                </div>

                {configuration.attachments &&
                  <div className={s.MapObject}>
                    {configuration.attachments.map(attachment => (
                      <FormItem key={attachment.name}>
                        <div className={s.MapObjectBlock}>
                          <div className={s.Label}>
                            <FormLabel content={attachment.label} />
                            <div className={s.EntryButton}>
                              <Button
                                svgIcon={enableIcon}
                                onClick={() => {}}
                                title='help information'
                                type='primary'
                              />
                            </div>
                          </div>
                          <div className={s.Input}>
                            <IoConfigField
                              name={attachment.name}
                              isRequired={attachment.isRequired}
                              type={attachment.type}
                              help={attachment.help}
                              label={attachment.label}
                              value={configurations[configuration.name][attachment.name as keyof ConfigurationValue]}
                              onChange={(v) => changeAttachment(configuration.name, attachment.name, v)}
                              configurations={configurations}
                              enum={attachment.enum}
                              mapType={attachment.mapType}
                            />
                          </div>
                        </div>
                      </FormItem>
                    ))}
                  </div>
                }
                
                {!configuration.attachments && (configuration.type !== 'map' || typeof(configuration.mapType) === 'string') &&
                  <div key={configuration.name} className={s.Input}>
                    <IoConfigField
                      name={configuration.name}
                      isRequired={configuration.isRequired}
                      type={configuration.type}
                      help={configuration.help}
                      label={configuration.label}
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
                  <div className={s.MapObjects}>
                    {Object.keys(configurations[configuration.name]).map(configurationKey => (
                      <div key={configurationKey} className={s.MapObject}>
                        <div className={s.MapObjectDelete}>
                          <Button
                            svgIcon={deleteIcon}
                            onClick={() => reduceMap(configuration.name, configurationKey)}
                            type="danger"
                            title={`Delete ${configuration.label.toLowerCase().slice(0, -1)}`}
                          />
                        </div>
                        {configuration.mapType && configuration.mapType !== 'string' && configuration.mapType.map(key => (
                          <div key={key.name} className={`${key.attachments ? s.MapObjectAttachmentBlock : s.MapObjectBlock}`}>
                            <div className={`${s.Label} ${sf.FormItem}`} >
                              <FormLabel
                                content={key.label}
                                isRequired={configuration.isRequired}
                              />
                              <div className={s.EntryButton}>
                                <Button
                                  svgIcon={enableIcon}
                                  onClick={() => {}}
                                  title='help information'
                                  type='primary'
                                />
                              </div>
                            </div>
                            {key.attachments &&
                              <div className={s.MapObject}>
                                {key.attachments.map((attachment) => (
                                  <div className={s.Field} key={attachment.name}>
                                    <div className={s.Label}>
                                      <FormLabel
                                        content={attachment.label}
                                        isRequired={configuration.isRequired}
                                      />
                                      <div className={s.EntryButton}>
                                        <Button
                                          svgIcon={enableIcon}
                                          onClick={() => {}}
                                          title='help information'
                                          type='primary'
                                        />
                                      </div>
                                    </div>
                                    <div className={s.Input}>
                                      <IoConfigField
                                        name={attachment.name}
                                        isRequired={attachment.isRequired}
                                        type={attachment.type}
                                        help={attachment.help}
                                        label={attachment.label}
                                        value={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name][attachment.name]}
                                        onChange={(value) => changeMap(configuration.name, configurationKey, key.name, value, attachment.name)}
                                        configurations={configurations[configuration.name][configurationKey as keyof ConfigurationValue][key.name]}
                                        enum={attachment.enum}
                                        mapType={attachment.mapType}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            }

                            {configuration.mapType && !key.attachments && (key.type !== 'map' || typeof(key.mapType) === 'string') &&
                              <div key={key.name} className={s.Input}>
                                <IoConfigField
                                  name={key.name}
                                  isRequired={key.isRequired}
                                  type={key.type}
                                  help={key.help}
                                  label={key.label}
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
                    <button
                      className={`${sl.AddButton} ${sl.AddButtonEnabled}`}
                      type="button"
                      onClick={() => expandMap(configuration.name)}
                    >
                      {`Add ${configuration.label.toLowerCase().slice(0, -1)}`}
                    </button>
                  </div>
                }

                {configuration.type === 'conditionalAttachments' && configuration.conditionalAttachments && 
                  <div className={s.MapObject}>
                    {configuration.conditionalAttachments.fields[configurations[configuration.conditionalAttachments.limitation]].map(attachment => {
                      const connectorsConfigs = configurations[configuration.name];
                      const nesteds = isConnectorsConfigs(connectorsConfigs) && configuration.conditionalAttachments && connectorsConfigs[configurations[configuration.conditionalAttachments.limitation]][attachment.name];
                      
                      return (
                        <div className={`${s.MapObjectBlock} ${s.Field}`} key={attachment.name}>
                          <div className={s.Label}>
                            <FormLabel content={attachment.label} />
                            <div className={s.EntryButton}>
                              <Button
                                svgIcon={enableIcon}
                                onClick={() => {}}
                                title='help information'
                                type='primary'
                              />
                            </div>
                          </div>

                          {attachment.attachments && 
                            <div key={attachment.name} className={s.MapObject}>
                              {attachment.attachments.map(nested => {
                                return (
                                  <div key={nested.name} className={`${s.MapObjectBlock}`}>
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
                                    <div className={s.Input}>
                                      {typeof nesteds !== 'undefined' &&
                                        <IoConfigField
                                          name={nested.name}
                                          isRequired={nested.isRequired}
                                          type={nested.type}
                                          help={nested.help}
                                          label={nested.label}
                                          value={isElasticSearchSslConfigs(nesteds) && nesteds[nested.name]}
                                          onChange={(v) => configuration.conditionalAttachments && changeConditionalAttachments(configuration.name, attachment.name, configurations[configuration.conditionalAttachments.limitation], v, nested.name)}
                                          configurations={configurations}
                                          enum={nested.enum}
                                          mapType={nested.mapType}
                                        />
                                      }
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          }
                          
                          {!attachment.attachments && (attachment.type !== 'map' || typeof(attachment.mapType) === 'string') &&
                            <div key={attachment.name} className={s.Input}>
                              {typeof nesteds !== 'undefined' &&
                                <IoConfigField
                                  name={attachment.name}
                                  isRequired={attachment.isRequired}
                                  type={attachment.type}
                                  help={attachment.help}
                                  label={attachment.label}
                                  value={!isElasticSearchSslConfigs(nesteds) && nesteds} 
                                  onChange={(v) => configuration.conditionalAttachments && changeConditionalAttachments(configuration.name, attachment.name, configurations[configuration.conditionalAttachments.limitation], v)}
                                  configurations={configurations}
                                  enum={attachment.enum}
                                  mapType={attachment.mapType}
                                />
                              }
                            </div>
                          }
                        </div>
                      )
                    })}
                  </div>
                }
              </> 
            }
          </div>
        </FormItem>
      ))}

      <div className={`${s.Buttons}`}>
        <Button
          text={props.action === 'create' ? 'Create' : 'Update'}
          onClick={() => updateSink()}
          type='primary'
          disabled={!configurations.name || !configurations.inputs.length || !configurations.inputs[0].length || !configurations.pathToConnector.path}
        />
        <Button
          text={`${hideUnrequired ? 'Show' : 'Hide'} unrequired`}
          onClick={() => setHideUnrequired(!hideUnrequired)}
          type='regular'
        />
      </div>
    </div>
  )
}

export default UpdateSink;