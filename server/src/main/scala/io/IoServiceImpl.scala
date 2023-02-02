package io

import org.apache.pulsar.client.api.{Consumer, ConsumerCryptoFailureAction, MessageListener, ProducerCryptoFailureAction, PulsarClient, SubscriptionInitialPosition}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.io.v1.io as pb
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import org.apache.pulsar.common.functions.{ConsumerConfig, CryptoConfig, FunctionConfig, Resources}
import org.apache.pulsar.common.io.SinkConfig
import org.apache.pulsar.common.util.ObjectMapperFactory
import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.core.`type`.TypeReference

import java.util.UUID
import scala.collection.mutable

class IoServiceImpl extends pb.IoServiceGrpc.IoService:
    val logger: Logger = Logger(getClass.getName)

    def subscriptionInitialPositionToPb(processing: Option[SubscriptionInitialPosition]): Option[pb.SubscriptionInitialPosition] = processing match
        case Some(SubscriptionInitialPosition.Earliest) =>
            Some(pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST)
        case Some(SubscriptionInitialPosition.Latest) =>
            Some(pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST)

    def producerCryptoFailureActionToPb(producer: Option[ProducerCryptoFailureAction]): Option[pb.ProducerCryptoFailureAction] = producer match
        case Some(ProducerCryptoFailureAction.FAIL) =>
            Some(pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_FAIL)
        case Some(ProducerCryptoFailureAction.SEND) =>
            Some(pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_SEND)
        case _ => None

    def consumerCryptoFailureActionToPb(consumer: Option[ConsumerCryptoFailureAction]): Option[pb.ConsumerCryptoFailureAction] = consumer match
        case Some(ConsumerCryptoFailureAction.FAIL) =>
            Some(pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_FAIL)
        case Some(ConsumerCryptoFailureAction.CONSUME) =>
            Some(pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_CONSUME)
        case Some(ConsumerCryptoFailureAction.DISCARD) =>
            Some(pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_DISCARD)
        case _ => None

    def processingGuaranteesToPb(processing: Option[FunctionConfig.ProcessingGuarantees]): Option[pb.ProcessingGuarantees] = processing match
        case Some(FunctionConfig.ProcessingGuarantees.ATMOST_ONCE) =>
            Some(pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATMOST_ONCE)
        case Some(FunctionConfig.ProcessingGuarantees.ATLEAST_ONCE) =>
            Some(pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATLEAST_ONCE)
        case Some(FunctionConfig.ProcessingGuarantees.EFFECTIVELY_ONCE) =>
            Some(pb.ProcessingGuarantees.PROCESSING_GUARANTEES_EFFECTIVELY_ONCE)
        case _ => None

    def parseConfigs(json: String) = {
        val mapper = ObjectMapperFactory.getThreadLocal()
        val typeRef = new TypeReference[mutable.HashMap[String, Object]] {}
        mapper.readValue(json, typeRef)
    }

    override def createSink(request: pb.CreateSinkRequest): Future[pb.CreateSinkResponse] =
        try {
            val sinkConfig = request.sinkConfig match
                case Some(v) =>
                    def subscriptionInitialPositionFromPb(processing: pb.SubscriptionInitialPosition): SubscriptionInitialPosition = processing match
                        case pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST =>
                            SubscriptionInitialPosition.Earliest
                        case pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST =>
                            SubscriptionInitialPosition.Latest

                    def producerCryptoFailureActionFromPb(producer: pb.ProducerCryptoFailureAction): ProducerCryptoFailureAction = producer match
                        case pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_FAIL =>
                            ProducerCryptoFailureAction.FAIL
                        case pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_SEND =>
                            ProducerCryptoFailureAction.SEND

                    def consumerCryptoFailureActionFromPb(consumer: pb.ConsumerCryptoFailureAction): ConsumerCryptoFailureAction = consumer match
                        case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_FAIL =>
                            ConsumerCryptoFailureAction.FAIL
                        case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_CONSUME =>
                            ConsumerCryptoFailureAction.CONSUME
                        case pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_DISCARD =>
                            ConsumerCryptoFailureAction.DISCARD

                    def processingGuaranteesFromPb(processing: pb.ProcessingGuarantees): FunctionConfig.ProcessingGuarantees = processing match
                        case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATMOST_ONCE =>
                            FunctionConfig.ProcessingGuarantees.ATMOST_ONCE
                        case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATLEAST_ONCE =>
                            FunctionConfig.ProcessingGuarantees.ATLEAST_ONCE
                        case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_EFFECTIVELY_ONCE =>
                            FunctionConfig.ProcessingGuarantees.EFFECTIVELY_ONCE

                    def cryptoConfigConverter(cryptoConfig: Option[pb.CryptoConfig]): CryptoConfig = cryptoConfig match
                        case Some(v) =>
                            CryptoConfig (
                                cryptoKeyReaderClassName = v.cryptoKeyReaderClassName,
                                cryptoKeyReaderConfig = parseConfigs(v.cryptoKeyReaderConfig).toMap.asJava,
                                encryptionKeys = v.encryptionKeys.toArray,
                                producerCryptoFailureAction = producerCryptoFailureActionFromPb(v.producerCryptoFailureAction),
                                consumerCryptoFailureAction = consumerCryptoFailureActionFromPb(v.consumerCryptoFailureAction),
                            )

                    var inputSpecs = Map[String, ConsumerConfig]()
                    v.inputSpecs.foreach((specs, configs) =>
                        inputSpecs + (specs -> ConsumerConfig(
                            schemaType = configs.schemaType,
                            serdeClassName = configs.serdeClassName,
                            isRegexPattern = configs.isRegexPattern,
                            schemaProperties = configs.schemaProperties.asJava,
                            consumerProperties = configs.consumerProperties.asJava,
                            receiverQueueSize = configs.receiverQueueSize,
                            cryptoConfig = cryptoConfigConverter(configs.cryptoConfig),
                            poolMessages = configs.poolMessages,
                        )))

                    val convertedResources = v.resources match
                        case Some(v) => Resources(
                            cpu = v.cpu,
                            ram = v.ram,
                            disk = v.disk,
                        )

                    SinkConfig(
                        tenant = "public",  //it works              v.tenant, required
                        namespace = "default", //it works           v.namespace, required
                        name = v.name, //                                       required
                        className = null, // if using archive "org.apache.pulsar.io.cassandra.CassandraStringSink", // v.className, required
                        sourceSubscriptionName = null,  //v.sourceSubscriptionName, -- it works
                        sourceSubscriptionPosition = subscriptionInitialPositionFromPb(v.sourceSubscriptionPosition),
                        inputs = List("persistent://public/default/X").asJava, // required
                        topicToSerdeClassName = null, // v.topicToSerdeClassName.asJava, // ("string" -> desiariliza class)
                        topicsPattern = null, // v.topicsPattern, -- it works
                        topicToSchemaType = null, // v.topicToSchemaType.asJava, (string -> special class)
                        topicToSchemaProperties = null, ///  v.topicToSchemaProperties.asJava, -- it works
                        inputSpecs = null, // inputSpecs.asJava, -- it works
                        maxMessageRetries = v.maxMessageRetries,
                        deadLetterTopic = null, // v.deadLetterTopic, -- it works
                        configs = null, // parseConfigs(v.configs).toMap.asJava, //
                        secrets = null, // parseConfigs(v.secrets).toMap.asJava, //
                        parallelism = null, //v.parallelism,  -- it works
                        processingGuarantees = processingGuaranteesFromPb(v.processingGuarantees),
                        retainOrdering = v.retainOrdering,
                        retainKeyOrdering = v.retainKeyOrdering,
                        resources = null, // convertedResources -- it works             ///only if docker
                        autoAck = v.autoAck,
                        timeoutMs = null, // v.timeoutMs, -- it works
                        negativeAckRedeliveryDelayMs = null, // v.negativeAckRedeliveryDelayMs, -- it works
                        archive = null, //"file:///pulsar/connectors/pulsar-io-cassandra-2.11.0.nar", // connector // null,
                        cleanupSubscription = null, // v.cleanupSubscription, -- it works
                        runtimeFlags = null, // v.runtimeFlags,
                        customRuntimeOptions = null, // v.customRuntimeOptions,
                    )
//            [ConnectorDefinition(
//                name=aerospike,
//                description=Aerospike database sink,
//                sourceClass=null,
//                sinkClass=org.apache.pulsar.io.aerospike.AerospikeStringSink,
//                sourceConfigClass=null,
//                sinkConfigClass=org.apache.pulsar.io.aerospike.AerospikeSinkConfig),
//                ConnectorDefinition(name=batch-data-generator,
//                description=Test batch data generator source,
//                sourceClass=org.apache.pulsar.io.batchdatagenerator.BatchDataGeneratorSource,
//                sinkClass=org.apache.pulsar.io.batchdatagenerator.BatchDataGeneratorPrintSink,
//                sourceConfigClass=null, sinkConfigClass=null),
//
//                ConnectorDefinition(name=cassandra, description=Writes data into Cassandra, sourceClass=null, sinkClass=org.apache.pulsar.io.cassandra.CassandraStringSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.cassandra.CassandraSinkConfig),
//                ConnectorDefinition(name=data-generator, description=Test data generator source, sourceClass=org.apache.pulsar.io.datagenerator.DataGeneratorSource, sinkClass=org.apache.pulsar.io.datagenerator.DataGeneratorPrintSink, sourceConfigClass=org.apache.pulsar.io.datagenerator.DataGeneratorSourceConfig, sinkConfigClass=null),
//                ConnectorDefinition(name=elastic_search, description=Writes data into Elastic Search, sourceClass=null, sinkClass=org.apache.pulsar.io.elasticsearch.ElasticSearchSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.elasticsearch.ElasticSearchConfig),
//                ConnectorDefinition(name=flume, description=flume source and sink connector, sourceClass=org.apache.pulsar.io.flume.source.StringSource, sinkClass=org.apache.pulsar.io.flume.sink.StringSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.flume.FlumeConfig),
//                ConnectorDefinition(name=hbase, description=Writes data into hbase table, sourceClass=null, sinkClass=org.apache.pulsar.io.hbase.sink.HbaseGenericRecordSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.hbase.sink.HbaseSinkConfig),
//                ConnectorDefinition(name=hdfs2, description=Writes data into HDFS 2.x, sourceClass=null, sinkClass=org.apache.pulsar.io.hdfs2.sink.text.HdfsStringSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.hdfs2.sink.HdfsSinkConfig),
//                ConnectorDefinition(name=hdfs3, description=Writes data into HDFS 3.x, sourceClass=null, sinkClass=org.apache.pulsar.io.hdfs3.sink.text.HdfsStringSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.hdfs3.sink.HdfsSinkConfig),
//                ConnectorDefinition(name=http, description=Writes data to an HTTP server (Webhook), sourceClass=null, sinkClass=org.apache.pulsar.io.http.HttpSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.http.HttpSinkConfig),
//                ConnectorDefinition(name=influxdb, description=Writes data into InfluxDB database, sourceClass=null, sinkClass=org.apache.pulsar.io.influxdb.InfluxDBGenericRecordSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.influxdb.v2.InfluxDBSinkConfig),
//                ConnectorDefinition(name=jdbc-clickhouse, description=JDBC sink for ClickHouse, sourceClass=null, sinkClass=org.apache.pulsar.io.jdbc.ClickHouseJdbcAutoSchemaSink, sourceConfigClass=null, sinkConfigClass=null),
//                ConnectorDefinition(name=jdbc-mariadb, description=JDBC sink for MariaDB, sourceClass=null, sinkClass=org.apache.pulsar.io.jdbc.MariadbJdbcAutoSchemaSink, sourceConfigClass=null, sinkConfigClass=null),
//                ConnectorDefinition(name=jdbc-openmldb, description=JDBC sink for OpenMLDB, sourceClass=null, sinkClass=org.apache.pulsar.io.jdbc.OpenMLDBJdbcAutoSchemaSink, sourceConfigClass=null, sinkConfigClass=null),
//                ConnectorDefinition(name=jdbc-postgres, description=JDBC sink for PostgreSQL, sourceClass=null, sinkClass=org.apache.pulsar.io.jdbc.PostgresJdbcAutoSchemaSink, sourceConfigClass=null, sinkConfigClass=null),
//                ConnectorDefinition(name=jdbc-sqlite, description=JDBC sink for SQLite, sourceClass=null, sinkClass=org.apache.pulsar.io.jdbc.SqliteJdbcAutoSchemaSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.jdbc.JdbcSinkConfig),
//                ConnectorDefinition(name=kafka, description=Kafka source and sink connector, sourceClass=org.apache.pulsar.io.kafka.KafkaBytesSource, sinkClass=org.apache.pulsar.io.kafka.KafkaBytesSink, sourceConfigClass=org.apache.pulsar.io.kafka.KafkaSourceConfig, sinkConfigClass=org.apache.pulsar.io.kafka.KafkaSinkConfig),
//                ConnectorDefinition(name=kafka-connect-adaptor, description=Kafka source connect adaptor, sourceClass=org.apache.pulsar.io.kafka.connect.KafkaConnectSource, sinkClass=org.apache.pulsar.io.kafka.connect.KafkaConnectSink, sourceConfigClass=null, sinkConfigClass=null),
//                ConnectorDefinition(name=kinesis, description=Kinesis connectors, sourceClass=org.apache.pulsar.io.kinesis.KinesisSource, sinkClass=org.apache.pulsar.io.kinesis.KinesisSink, sourceConfigClass=org.apache.pulsar.io.kinesis.KinesisSourceConfig, sinkConfigClass=org.apache.pulsar.io.kinesis.KinesisSinkConfig),
//                ConnectorDefinition(name=mongo, description=MongoDB source and sink connector, sourceClass=org.apache.pulsar.io.mongodb.MongoSource, sinkClass=org.apache.pulsar.io.mongodb.MongoSink, sourceConfigClass=org.apache.pulsar.io.mongodb.MongoConfig, sinkConfigClass=org.apache.pulsar.io.mongodb.MongoConfig),
//                ConnectorDefinition(name=rabbitmq, description=RabbitMQ source and sink connector, sourceClass=org.apache.pulsar.io.rabbitmq.RabbitMQSource, sinkClass=org.apache.pulsar.io.rabbitmq.RabbitMQSink, sourceConfigClass=org.apache.pulsar.io.rabbitmq.RabbitMQSourceConfig, sinkConfigClass=org.apache.pulsar.io.rabbitmq.RabbitMQSinkConfig),
//                ConnectorDefinition(name=redis, description=Writes data into Redis, sourceClass=null, sinkClass=org.apache.pulsar.io.redis.sink.RedisSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.redis.sink.RedisSinkConfig),
//                ConnectorDefinition(name=solr, description=Writes data into solr collection, sourceClass=null, sinkClass=org.apache.pulsar.io.solr.SolrGenericRecordSink, sourceConfigClass=null, sinkConfigClass=org.apache.pulsar.io.solr.SolrSinkConfig)
//            ]

            adminClient.sinks.createSinkWithUrl(sinkConfig, "https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-cassandra-2.11.0.nar")
//            adminClient.sinks.createSink(sinkConfig, null) // ERROR MAKER

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.CreateSinkResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateSinkResponse(status = Some(status)))
        }
