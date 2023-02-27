import React, { useState } from 'react';
import useSWR from 'swr';
import stringify from 'safe-stable-stringify';

import UpdateSink from '../UpdateSink/UpdateSink';
import { swrKeys } from '../../../../swrKeys';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { mapToObject } from '../../../../../pbUtils/pbUtils';
import { Configurations, PathToConnectorType, SubscriptionInitialPosition, configurations as defaultConfigurations, InputsSpecs, InputSpecs, CryptoConfig, ConsumerCryptoFailureAction, ProducerCryptoFailureAction, ProcessingGuarantees, Resources, SinkType, ClassName } from '../configurationsFields/configurationsFields';
import { ConnectorsConfigsTypes, defaultConnectorsConfigs } from '../configurationsFields/connectrosConfigs/configs';
import { InfluxDBv1Configs } from '../configurationsFields/connectrosConfigs/connectors/influxDBv1Configs';
import { InfluxDBv2Configs } from '../configurationsFields/connectrosConfigs/connectors/influxDBv2Configs';

import s from './EditSink.module.css';

type EditSinkProps = {
  tenant: string,
  namespace: string,
  sink: string,
}

const EditSink = (props: EditSinkProps) => {

  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const [configurations, setConfigurations] = useState<Configurations>(defaultConfigurations);

  const pathToConnectorUrlFromPb = (value: pb.PathType | undefined): PathToConnectorType => {
    switch (value) {
      case pb.PathType.PATH_TYPE_URL :
        return 'url';
      case pb.PathType.PATH_TYPE_FOLDER:
        return 'folder';
      default: 
        return 'url';
    }
  }

  const sourceSubscriptionPositionFromPb = (value: pb.SubscriptionInitialPosition | undefined): SubscriptionInitialPosition => {
    switch (value) {
      case pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST:
        return 'earliest';
      case pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST:
        return 'latest';
      default:
        return 'earliest';
    }
  }

  const producerCryptoFailureActionFromPb = (value: pb.ProducerCryptoFailureAction | undefined): ProducerCryptoFailureAction => {
    switch (value) {
      case pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_FAIL:
        return 'fail';
      case pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_SEND:
        return 'send';
      default: 
        return 'fail';
    }
  }

  const consumerCryptoFailureActionFromPb = (value: pb.ConsumerCryptoFailureAction | undefined): ConsumerCryptoFailureAction => {
    switch (value) {
      case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_CONSUME:
        return 'consume';
      case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_DISCARD:
        return 'discard';
      case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_FAIL:
        return 'fail';
      default:
        return 'fail';
    }
  }

  const processingGuaranteesFromPb = (value: pb.ProcessingGuarantees | undefined): ProcessingGuarantees => {
    switch (value) {
      case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATLEAST_ONCE:
        return 'atleast_once';
      case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATMOST_ONCE:
        return 'atmost_once';
      case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_EFFECTIVELY_ONCE:
        return 'effectively_once';
      default:
        return 'atleast_once';
    }
  }

  const sinkTypeFromPb = (value: pb.SinkType | undefined): SinkType => {
    switch (value) {
      case pb.SinkType.SINK_TYPE_AEROSPIKE:
        return 'aerospike';
      case pb.SinkType.SINK_TYPE_ALLUXIO:
        return 'alluxio';
      case pb.SinkType.SINK_TYPE_CASSANDRA:
        return 'cassandra';
      case pb.SinkType.SINK_TYPE_ELASTIC_SEARCH:
        return 'elasticSearch';
      case pb.SinkType.SINK_TYPE_FLUME:
        return 'flume';
      case pb.SinkType.SINK_TYPE_HBASE:
        return 'hbase';
      case pb.SinkType.SINK_TYPE_HDFS2:
        return 'hdfs2';
      case pb.SinkType.SINK_TYPE_HDFS3:
        return 'hdfs3';
      case pb.SinkType.SINK_TYPE_HTTP:
        return 'http';
      case pb.SinkType.SINK_TYPE_INFLUXDB_V1:
        return 'influxdbv1';
      case pb.SinkType.SINK_TYPE_INFLUXDB_V2:
        return 'influxdbv2';
      case pb.SinkType.SINK_TYPE_JDBC_CLICK_HOUSE:
        return 'jdbcClickHouse';
      case pb.SinkType.SINK_TYPE_JDBC_MARIA_DB:
        return 'jdbcMariaDB';
      case pb.SinkType.SINK_TYPE_JDBC_OPEN_MLDB:
        return 'jdbcOpenMLDB';
      case pb.SinkType.SINK_TYPE_JDBC_POSTRGRES:
        return 'jdbcPostgres';
      case pb.SinkType.SINK_TYPE_JDBC_SQLITE:
        return 'jdbcSQLite';
      case pb.SinkType.SINK_TYPE_KAFKA:
        return 'kafka';
      case pb.SinkType.SINK_TYPE_KINESIS:
        return 'kinesis';
      case pb.SinkType.SINK_TYPE_MONGODB:
        return 'mongodb';
      case pb.SinkType.SINK_TYPE_RABBITMQ:
        return 'rabbitMQ';
      case pb.SinkType.SINK_TYPE_REDIS:
        return 'redis';
      case pb.SinkType.SINK_TYPE_SOLR:
        return 'solr';
      default:
        return 'jdbcPostgres';
    }
  }

  const classNameFromPb = (value: pb.ClassName | undefined): ClassName => {
    switch (value) {
      case pb.ClassName.CLASS_NAME_ABSTRACT_HDFS2_CONNECTOR:
        return 'AbstractHdfs2Connector';
      case pb.ClassName.CLASS_NAME_ABSTRACT_HDFS3_CONNECTOR:
        return 'AbstractHdfs3Connector';
      case pb.ClassName.CLASS_NAME_AEROSPIKE_STRING_SINK:
        return 'AerospikeStringSink';
      case pb.ClassName.CLASS_NAME_ALLUXIO_SINK:
        return 'AlluxioSink';
      case pb.ClassName.CLASS_NAME_CASSANDRA_STRING_SINK:
        return 'CassandraStringSink';
      case pb.ClassName.CLASS_NAME_CLICK_HOUSE_JDBC_AUTO_SCHEMA_SINK:
        return 'ClickHouseJdbcAutoSchemaSink';
      case pb.ClassName.CLASS_NAME_ELASTIC_SEARCH_SINK:
        return 'ElasticSearchSink';
      case pb.ClassName.CLASS_NAME_HBASE_ABSTRACT_CONFIG:
        return 'HbaseAbstractConfig';
      case pb.ClassName.CLASS_NAME_HTTP_SINK:
        return 'HttpSink';
      case pb.ClassName.CLASS_NAME_INFLUXDB_GENERIC_RECORD_SINK:
        return 'InfluxDBGenericRecordSink';
      case pb.ClassName.CLASS_NAME_KAFKA_ABSTRACT_SINK:
        return 'KafkaAbstractSink';
      case pb.ClassName.CLASS_NAME_KINESIS_SINK:
        return 'KinesisSink';
      case pb.ClassName.CLASS_NAME_MARIADB_JDBC_AUTO_SCHEMA_SINK:
        return 'MariadbJdbcAutoSchemaSink';
      case pb.ClassName.CLASS_NAME_MONGO_SINK:
        return 'MongoSink';
      case pb.ClassName.CLASS_NAME_OPEN_MLDB_JDBC_AUTO_SCHEMA_SINK:
        return 'OpenMLDBJdbcAutoSchemaSink';
      case pb.ClassName.CLASS_NAME_POSTGRES_JDBC_AUTO_SCHEMA_SINK:
        return 'PostgresJdbcAutoSchemaSink';
      case pb.ClassName.CLASS_NAME_RABBIT_MQ_SINK:
        return 'RabbitMQSink';
      case pb.ClassName.CLASS_NAME_REDIS_ABSTRACT_CONFIG:
        return 'RedisAbstractConfig';
      case pb.ClassName.CLASS_NAME_SOLR_SINK_CONFIG:
        return 'SolrSinkConfig';
      case pb.ClassName.CLASS_NAME_SQLITE_JDBC_AUTO_SCHEMA_SINK:
        return 'SqliteJdbcAutoSchemaSink';
      case pb.ClassName.CLASS_NAME_STRING_SINK:
        return 'StringSink';
      default:
        return 'AbstractHdfs2Connector';
    }
  }

  const getInputsSpecs = (inputsSpecs: Record<string, pb.InputsSpecs>): InputsSpecs => {
    const inputs: InputsSpecs = {};

    const getCryptoConfig = (cryptoConfig: pb.CryptoConfig | undefined): CryptoConfig => {
      const config: CryptoConfig = {
        cryptoKeyReaderClassName: cryptoConfig?.getCryptoKeyReaderClassName() || '',
        cryptoKeyReaderConfig: cryptoConfig?.getCryptoKeyReaderConfig() || '',
        encryptionKeys: cryptoConfig?.getEncryptionKeysList() || [],
        producerCryptoFailureAction: producerCryptoFailureActionFromPb(cryptoConfig?.getProducerCryptoFailureAction()),
        consumerCryptoFailureAction: consumerCryptoFailureActionFromPb(cryptoConfig?.getConsumerCryptoFailureAction()),
      }

      return config;
    }

    Object.keys(inputsSpecs).map(input => {
      const specs: InputSpecs = {
        name: input,
        schemaType: inputsSpecs[input].getSchemaType(),
        serdeClassName: inputsSpecs[input].getSerdeClassName(),
        schemaProperties: mapToObject(inputsSpecs[input].getSchemaPropertiesMap()),
        consumerProperties: mapToObject(inputsSpecs[input].getConsumerPropertiesMap()),
        receiverQueueSize: inputsSpecs[input].getReceiverQueueSize(),
        poolMessages: inputsSpecs[input].getPoolMessages(),
        isRegexPattern: inputsSpecs[input].getIsRegexPattern(),
        cryptoConfig: getCryptoConfig(inputsSpecs[input].getCryptoConfig()),
      }

      inputs[input] = specs;
    });

    return inputs;
  }

  const getResources = (resourcesPb: pb.Resources | undefined): Resources => {
    const resources: Resources = {
      cpu: resourcesPb?.getCpu() || 1,
      ram: resourcesPb?.getRam() || 2,
      disk: resourcesPb?.getDisk() || 100,
    }

    return resources;
  }

  const isInfluxDBv1 = (configs: ConnectorsConfigsTypes): configs is InfluxDBv1Configs => {
    if (configs.hasOwnProperty('consistencyLevel')) {
      return true;
    }
    return false;
  }

  const isInfluxDBv2 = (configs: ConnectorsConfigsTypes): configs is InfluxDBv2Configs => {
    if (configs.hasOwnProperty('precision') ) {
      return true;
    }
    return false;
  }

  const { data: sink, error: groupsError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.io.sinks.edit._({ tenant: props.tenant, namespace: props.namespace, sink: props.sink }),
    async () => {
      const req = new pb.GetSinkRequest();
      req.setTenant(props.tenant);
      req.setNamespace(props.namespace);
      req.setSink(props.sink);

      const res = await ioServiceClient.getSink(req, {});
      
      if (res === undefined) {
        return [];
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get sink: ${res.getStatus()?.getMessage()}`);
        return [];
      }

      const sinkConfigs = res.getSinkConfig();
      let sinkType: SinkType = sinkTypeFromPb(sinkConfigs?.getSinkType());
      const connectorsConfigs = sinkConfigs?.getConfigs() && JSON.parse(sinkConfigs?.getConfigs());
      const configs = defaultConnectorsConfigs;

      if (isInfluxDBv1(connectorsConfigs)) {
        sinkType = 'influxdbv1';
      } else if (isInfluxDBv2(connectorsConfigs)) {
        sinkType = 'influxdbv2';
      }

      configs[sinkType] = connectorsConfigs;

      const sink: Configurations = {
        tenant: sinkConfigs?.getTenant() || '',
        namespace: sinkConfigs?.getNamespace() || '',
        name: sinkConfigs?.getName() || '',
        pathToConnector: {
          type: pathToConnectorUrlFromPb(sinkConfigs?.getPathToConnector()?.getType()),
          path: sinkConfigs?.getPathToConnector()?.getPath() || 'jdbc-postgres',
        },
        inputs: sinkConfigs?.getInputsList() || [],
        sourceSubscriptionName: sinkConfigs?.getSourceSubscriptionName() || '',
        sourceSubscriptionPosition: sourceSubscriptionPositionFromPb(sinkConfigs?.getSourceSubscriptionPosition()),
        topicsPattern: sinkConfigs?.getTopicsPattern() || '',
        topicToSchemaProperties: sinkConfigs ? mapToObject(sinkConfigs.getTopicToSchemaPropertiesMap()) : {},
        inputsSpecs: sinkConfigs ? getInputsSpecs(mapToObject(sinkConfigs.getInputSpecsMap())) : {},
        sinkType: sinkType,
        maxMessageRetries: sinkConfigs?.getMaxMessageRetries() || 0,
        deadLetterTopic: sinkConfigs?.getDeadLetterTopic() || '',
        parallelism: sinkConfigs?.getParallelism() || 0,
        processingGuarantees: processingGuaranteesFromPb(sinkConfigs?.getProcessingGuarantees()),
        retainOrdering: sinkConfigs?.getRetainOrdering() || false,
        retainKeyOrdering: sinkConfigs?.getRetainKeyOrdering() || false,
        autoAck: sinkConfigs?.getAutoAck() || true,
        timeoutMs: sinkConfigs?.getTimeoutMs() || 0,
        negativeAckRedeliveryDelayMs: sinkConfigs?.getNegativeAckRedeliveryDelayMs() || 0,
        cleanupSubscription: sinkConfigs?.getCleanupSubscription() || true,
        className: classNameFromPb(sinkConfigs?.getClassName()),
        topicToSerdeClassName: sinkConfigs ? mapToObject(sinkConfigs.getTopicToSerdeClassNameMap()): {},
        topicToSchemaType: sinkConfigs ? mapToObject(sinkConfigs.getTopicToSchemaTypeMap()): {},
        configs: configs,
        secrets: sinkConfigs?.getSecrets() || '',
        resources: getResources(sinkConfigs?.getResources()),
        archive: sinkConfigs?.getArchive() || '',
        runtimeFlags: sinkConfigs?.getRuntimeFlags() || '',
        customRuntimeOptions: sinkConfigs?.getCustomRuntimeOptions() || '',
      }

      setConfigurations(sink);
      return null;
    }
  );

  if (groupsError) {
    notifyError(`Unable to get sink configs. ${groupsError}`);
  }

  return (
    <>
      {configurations ? 
        <UpdateSink
          configurations={configurations}
          action='edit'
          tenant={props.tenant}
          namespace={props.namespace}
          key={stringify(configurations)}
        /> :
        <div className={s.NoData}>No data to show.</div>
      }
    </>
  )
}

export default EditSink;