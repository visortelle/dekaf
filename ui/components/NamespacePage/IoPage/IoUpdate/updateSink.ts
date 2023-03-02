import _ from 'lodash';

import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import {  Configurations, ConsumerCryptoFailureAction, SubscriptionInitialPosition, ProducerCryptoFailureAction, ProcessingGuarantees, PathToConnectorType, SinkType, ClassName } from '../Sinks/configurationsFields/configurationsFields';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';

export type UpdateSinkProps = {
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

const updateSink = async (props: UpdateSinkProps) => {
  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const req = props.action === 'create' ? new pb.CreateSinkRequest() : new pb.UpdateSinkRequest();
  const sinkConfig = new pb.SinkConfig();
  sinkConfig.setTenant(props.tenant);
  sinkConfig.setNamespace(props.namespace);
  sinkConfig.setName(props.configurations.name);
  sinkConfig.setClassName(classNameToPb(props.configurations.className));
  sinkConfig.setSourceSubscriptionName(props.configurations.sourceSubscriptionName);

  sinkConfig.setSourceSubscriptionPosition(sourceSubscriptionPositionToPb(props.configurations.sourceSubscriptionPosition));
  sinkConfig.setInputsList(props.configurations.inputs);

  Object.entries(props.configurations.topicToSerdeClassName).map(([key, value]) => {
    sinkConfig.getTopicToSerdeClassNameMap().set(key, value);
  });

  sinkConfig.setTopicsPattern(props.configurations.topicsPattern);

  Object.entries(props.configurations.topicToSchemaType).map(([key, value]) => {
    sinkConfig.getTopicToSchemaTypeMap().set(key, value);
  });

  Object.entries(props.configurations.topicToSchemaProperties).map(([key, value]) => {
    sinkConfig.getTopicToSchemaPropertiesMap().set(key, value);
  });

  Object.entries(props.configurations.inputsSpecs).map(([_, value]) => {
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
  
  sinkConfig.setMaxMessageRetries(props.configurations.maxMessageRetries);
  sinkConfig.setDeadLetterTopic(props.configurations.deadLetterTopic);
  sinkConfig.setConfigs(JSON.stringify(props.configurations.configs[props.configurations.sinkType]));
  sinkConfig.setSecrets(props.configurations.secrets);
  sinkConfig.setParallelism(props.configurations.parallelism);
  sinkConfig.setSinkType(sinkTypeToPb(props.configurations.sinkType));

  sinkConfig.setProcessingGuarantees(processingGuaranteesToPb(props.configurations.processingGuarantees));
  sinkConfig.setRetainOrdering(props.configurations.retainOrdering);
  sinkConfig.setRetainKeyOrdering(props.configurations.retainKeyOrdering);

  const resources = new pb.Resources();
  resources.setCpu(props.configurations.resources.cpu);
  resources.setDisk(props.configurations.resources.disk);
  resources.setRam(props.configurations.resources.ram);
  sinkConfig.setResources(resources);

  sinkConfig.setAutoAck(props.configurations.autoAck);
  sinkConfig.setTimeoutMs(props.configurations.timeoutMs);
  sinkConfig.setNegativeAckRedeliveryDelayMs(props.configurations.negativeAckRedeliveryDelayMs);
  sinkConfig.setArchive(props.configurations.archive);
  sinkConfig.setCleanupSubscription(props.configurations.cleanupSubscription);
  sinkConfig.setRuntimeFlags(props.configurations.runtimeFlags);
  sinkConfig.setCustomRuntimeOptions(props.configurations.customRuntimeOptions);

  const pathToConnector = new pb.PathToConnector();
  pathToConnector.setType(pathToConnectorToPb(props.configurations.pathToConnector.type))
  if (props.configurations.pathToConnector.type === 'url') {
    pathToConnector.setPath(`https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-${props.configurations.pathToConnector.path}-2.11.0.nar`); 
  } else {
    pathToConnector.setPath(props.configurations.pathToConnector.path);
  }
  sinkConfig.setPathToConnector(pathToConnector);

  req.setSinkConfig(sinkConfig);

  const res = props.action === 'create' ? await ioServiceClient.createSink(req, {}) : await ioServiceClient.updateSink(req, {});
  if (res.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to ${props.action} sink. ${res.getStatus()?.getMessage()}`);
    return;
  }
}

export default updateSink;