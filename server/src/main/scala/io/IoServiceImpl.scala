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
import org.apache.pulsar.common.functions.{ConsumerConfig, CryptoConfig, FunctionConfig, ProducerConfig, Resources}
import org.apache.pulsar.common.io.{BatchSourceConfig, SinkConfig, SourceConfig}
import org.apache.pulsar.common.util.ObjectMapperFactory
import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.core.`type`.TypeReference
import com.google.gson.JsonParser

import scala.collection.mutable
import io.circe.parser.*

// Serde class name
// import org.apache.pulsar.functions.source.TopicSchema
// https://github.com/apache/pulsar/blob/82237d3684fe506bcb6426b3b23f413422e6e4fb/pulsar-functions/instance/src/test/java/org/apache/pulsar/functions/sink/PulsarSinkTest.java

// Schema properties ?
// Consumer properties ?
// Encryption keys ?
// Archive ?
// Runtime flags ?

class IoServiceImpl extends pb.IoServiceGrpc.IoService:
    val logger: Logger = Logger(getClass.getName)

    def parseConfigs(json: String) = {
        def parser(json: String) = parse(json) match
            case Left(err) => Left(err)
            case Right(json) => json.asObject match
                case Some(obj) =>
                    Right(obj.toMap)
                case None => Left(new Exception("ERROR"))

        val jsonMap = parser(json)

        val objectMap = mutable.Map[String, Object]()
        jsonMap match
            case Left(err) => new Exception(err)
            case Right(map) =>
                map.foreach((key, json) => json.asObject match
                    case Some(obj) =>
                        objectMap += (key -> SinkConfig.builder().configs(obj.toMap.asJava))
                    case None => objectMap += (key -> json.toString.replaceAll("\"", ""))
            )
        objectMap.asJava
    }

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
        case pb.ProcessingGuarantees.PROCESSING_GUARANTEES_MANUAL =>
            FunctionConfig.ProcessingGuarantees.MANUAL

    def pathToConnectorFromPb(pathType: pb.PathType) = pathType match
        case pb.PathType.PATH_TYPE_URL => "url"
        case pb.PathType.PATH_TYPE_FOLDER => "folder"

    def classNameFromPb(className: pb.ClassName) = className match
        case pb.ClassName.CLASS_NAME_AEROSPIKE_STRING_SINK => "org.apache.pulsar.io.aerospike.AerospikeStringSink"
        case pb.ClassName.CLASS_NAME_ALLUXIO_SINK => "org.apache.pulsar.io.alluxio.sink.AlluxioSink"
        case pb.ClassName.CLASS_NAME_CASSANDRA_STRING_SINK => "org.apache.pulsar.io.cassandra.CassandraStringSink"
        case pb.ClassName.CLASS_NAME_ELASTIC_SEARCH_SINK => "org.apache.pulsar.io.elasticsearch.ElasticSearchSink"
        case pb.ClassName.CLASS_NAME_STRING_SINK => "org.apache.pulsar.io.flume.sink.StringSink"
        case pb.ClassName.CLASS_NAME_HBASE_ABSTRACT_CONFIG => "org.apache.pulsar.io.hbase.HbaseAbstractConfig"
        case pb.ClassName.CLASS_NAME_ABSTRACT_HDFS2_CONNECTOR => "org.apache.pulsar.io.hdfs2.AbstractHdfsConnector"
        case pb.ClassName.CLASS_NAME_ABSTRACT_HDFS3_CONNECTOR => "org.apache.pulsar.io.hdfs3.AbstractHdfsConnector"
        case pb.ClassName.CLASS_NAME_HTTP_SINK => "org.apache.pulsar.io.http.HttpSink"
        case pb.ClassName.CLASS_NAME_INFLUXDB_GENERIC_RECORD_SINK => "org.apache.pulsar.io.influxdb.InfluxDBGenericRecordSink"
        case pb.ClassName.CLASS_NAME_CLICK_HOUSE_JDBC_AUTO_SCHEMA_SINK => "org.apache.pulsar.io.jdbc.ClickHouseJdbcAutoSchemaSink"
        case pb.ClassName.CLASS_NAME_MARIADB_JDBC_AUTO_SCHEMA_SINK => "org.apache.pulsar.io.jdbc.MariadbJdbcAutoSchemaSink"
        case pb.ClassName.CLASS_NAME_OPEN_MLDB_JDBC_AUTO_SCHEMA_SINK => "org.apache.pulsar.io.jdbc.OpenMLDBJdbcAutoSchemaSink"
        case pb.ClassName.CLASS_NAME_POSTGRES_JDBC_AUTO_SCHEMA_SINK => "org.apache.pulsar.io.jdbc.PostgresJdbcAutoSchemaSink"
        case pb.ClassName.CLASS_NAME_SQLITE_JDBC_AUTO_SCHEMA_SINK => "org.apache.pulsar.io.jdbc.SqliteJdbcAutoSchemaSink"
        case pb.ClassName.CLASS_NAME_KAFKA_ABSTRACT_SINK => "org.apache.pulsar.io.kafka.KafkaAbstractSink"
        case pb.ClassName.CLASS_NAME_KINESIS_SINK => "org.apache.pulsar.io.kinesis.KinesisSink"
        case pb.ClassName.CLASS_NAME_MONGO_SINK => "org.apache.pulsar.io.mongodb.MongoSink"
        case pb.ClassName.CLASS_NAME_RABBIT_MQ_SINK => "org.apache.pulsar.io.rabbitmq.RabbitMQSink"
        case pb.ClassName.CLASS_NAME_REDIS_ABSTRACT_CONFIG => "org.apache.pulsar.io.redis.RedisAbstractConfig"
        case pb.ClassName.CLASS_NAME_SOLR_SINK_CONFIG => "org.apache.pulsar.io.solr.SolrSinkConfig"

    def sinkTypeFromPb(sinkType: pb.SinkType) = sinkType match
        case pb.SinkType.SINK_TYPE_AEROSPIKE => "aerospike"
        case pb.SinkType.SINK_TYPE_ALLUXIO => "alluxio"
        case pb.SinkType.SINK_TYPE_CASSANDRA => "cassandra"
        case pb.SinkType.SINK_TYPE_ELASTIC_SEARCH => "elastic_search"
        case pb.SinkType.SINK_TYPE_FLUME => "flume"
        case pb.SinkType.SINK_TYPE_HBASE => "hbase"
        case pb.SinkType.SINK_TYPE_HDFS2 => "hdfs2"
        case pb.SinkType.SINK_TYPE_HDFS3 => "hdfs3"
        case pb.SinkType.SINK_TYPE_HTTP => "http"
        case pb.SinkType.SINK_TYPE_INFLUXDB_V1 => "influxdb"
        case pb.SinkType.SINK_TYPE_INFLUXDB_V2 => "influxdb"
        case pb.SinkType.SINK_TYPE_JDBC_CLICK_HOUSE => "jdbc-clickhouse"
        case pb.SinkType.SINK_TYPE_JDBC_SQLITE => "jdbc-sqlite"
        case pb.SinkType.SINK_TYPE_JDBC_MARIA_DB => "jdbc-mariadb"
        case pb.SinkType.SINK_TYPE_JDBC_OPEN_MLDB => "jdbc-openmldb"
        case pb.SinkType.SINK_TYPE_JDBC_POSTRGRES => "jdbc-postgres"
        case pb.SinkType.SINK_TYPE_KAFKA => "kafka"
        case pb.SinkType.SINK_TYPE_KINESIS => "kinesis"
        case pb.SinkType.SINK_TYPE_MONGODB => "mongodb"
        case pb.SinkType.SINK_TYPE_RABBITMQ => "rabbitmq"
        case pb.SinkType.SINK_TYPE_REDIS => "redis"
        case pb.SinkType.SINK_TYPE_SOLR => "solr"

    def cryptoConfigConverterFromPb(cryptoConfig: Option[pb.CryptoConfig]): CryptoConfig = cryptoConfig match
        case Some(v) =>
            CryptoConfig(
                cryptoKeyReaderClassName = v.cryptoKeyReaderClassName,
                cryptoKeyReaderConfig = if v.cryptoKeyReaderConfig.length > 0 then parseConfigs(v.cryptoKeyReaderConfig) else null,
                encryptionKeys = v.encryptionKeys.toArray,
                producerCryptoFailureAction = producerCryptoFailureActionFromPb(v.producerCryptoFailureAction),
                consumerCryptoFailureAction = consumerCryptoFailureActionFromPb(v.consumerCryptoFailureAction),
            )

    def convertInputSpecs(inputSpecs: Map[String, pb.InputsSpecs]): java.util.Map[String, ConsumerConfig] =

        val convertedInputSpecs = Map[String, ConsumerConfig]()
        inputSpecs.foreach((specs, configs) =>
            convertedInputSpecs + (specs -> ConsumerConfig(
                schemaType = configs.schemaType,
                serdeClassName = configs.serdeClassName,
                isRegexPattern = configs.isRegexPattern,
                schemaProperties = configs.schemaProperties.asJava,
                consumerProperties = configs.consumerProperties.asJava,
                receiverQueueSize = configs.receiverQueueSize,
                cryptoConfig = cryptoConfigConverterFromPb(configs.cryptoConfig),
                poolMessages = configs.poolMessages,
            )))
        convertedInputSpecs.asJava

    def convertResourcesFromPb(resources: Option[pb.Resources]): Resources = resources match
        case Some(v) =>
            if v.cpu > 0 && v.ram > 0 && v.disk > 0 then
                Resources(
                    cpu = v.cpu,
                    ram = v.ram,
                    disk = v.disk,
                )
            else null
        case None => null

    override def createSink(request: pb.CreateSinkRequest): Future[pb.CreateSinkResponse] =
        try {
            request.sinkConfig match
                case Some(v) =>
                    val sinkConfig = SinkConfig(
                        tenant = v.tenant,
                        namespace = v.namespace,
                        name = v.name,
                        inputs = v.inputs.asJavaCollection,
                        sourceSubscriptionName = if v.sourceSubscriptionName.isEmpty then null else v.sourceSubscriptionName,
                        sourceSubscriptionPosition = subscriptionInitialPositionFromPb(v.sourceSubscriptionPosition),
                        topicsPattern = if v.topicsPattern.isEmpty then null else v.topicsPattern,
                        topicToSchemaProperties = if v.topicToSchemaProperties.size > 0 then v.topicToSchemaProperties.asJava else null,
                        inputSpecs = if v.inputSpecs.size > 0 then convertInputSpecs(v.inputSpecs) else null,
                        maxMessageRetries = if v.maxMessageRetries > 0 then v.maxMessageRetries else null,
                        deadLetterTopic = if v.deadLetterTopic.length > 0 then v.deadLetterTopic else null,
                        parallelism = if v.parallelism > 0 then v.parallelism else null,
                        processingGuarantees = processingGuaranteesFromPb(v.processingGuarantees),
                        retainOrdering = v.retainOrdering,
                        retainKeyOrdering = v.retainKeyOrdering,
                        autoAck = v.autoAck,
                        timeoutMs = if v.timeoutMs > 0 then v.timeoutMs else null,
                        negativeAckRedeliveryDelayMs = if v.negativeAckRedeliveryDelayMs > 0 then v.negativeAckRedeliveryDelayMs else null,
                        cleanupSubscription = v.cleanupSubscription,
                        sinkType = sinkTypeFromPb(v.sinkType),
                        className = classNameFromPb(v.className),
                        topicToSerdeClassName = if v.topicToSerdeClassName.isEmpty then null else v.topicToSerdeClassName.asJava,
                        topicToSchemaType = if v.topicToSchemaType.isEmpty then null else v.topicToSchemaType.asJava,
                        configs = if v.configs.isEmpty then null else parseConfigs(v.configs),
                        secrets = if v.secrets.isEmpty then null else parseConfigs(v.secrets),
                        resources = convertResourcesFromPb(v.resources),
                        archive = if v.archive.isEmpty then null else v.archive,
                        runtimeFlags = if v.runtimeFlags.isEmpty then null else v.runtimeFlags,
                        customRuntimeOptions = if v.customRuntimeOptions.isEmpty then null else v.customRuntimeOptions,
                    )

                    v.pathToConnector match
                        case Some(v) =>
                            if (pathToConnectorFromPb(v.`type`) == "url") {
                                adminClient.sinks.createSinkWithUrl(sinkConfig, v.path)
                            } else {
                                adminClient.sinks.createSink(sinkConfig, v.path)
                            }

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.CreateSinkResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateSinkResponse(status = Some(status)))
        }

    override def getSinks(request: pb.GetSinksRequest): Future[pb.GetSinksResponse] =
        try {
            var sinksSeq = Seq[pb.Sinks]()
                val sinks = adminClient.sinks.listSinks(request.tenant, request.namespace).asScala

            sinks.foreach(sink =>
                val sinkStatus = adminClient.sinks.getSinkStatus(request.tenant, request.namespace, sink)
                var running = 0
                var numReads = 0
                var numWrites = 0

                sinkStatus.instances.asScala.foreach(instance =>
                    if (instance.status.running) {
                        running += 1
                    }
                    numReads += instance.status.numReadFromPulsar.toInt
                    numWrites += instance.status.numWrittenToSink.toInt
                )

                sinksSeq = sinksSeq :+ pb.Sinks(
                    name = sink,
                    numInstances = sinkStatus.numInstances,
                    numRunning = sinkStatus.numRunning,
                    running = running,
                    reads = numReads,
                    writes = numWrites,
                )
            )

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.GetSinksResponse(status = Some(status), sinks = sinksSeq))
    } catch {
        case err =>
            val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
            Future.successful(pb.GetSinksResponse(status = Some(status)))
    }

    def subscriptionInitialPositionToPb(processing: SubscriptionInitialPosition): pb.SubscriptionInitialPosition = processing match
        case SubscriptionInitialPosition.Earliest =>
            pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST
        case SubscriptionInitialPosition.Latest =>
            pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST

    def producerCryptoFailureActionToPb(producer: ProducerCryptoFailureAction): pb.ProducerCryptoFailureAction = producer match
        case ProducerCryptoFailureAction.FAIL =>
            pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_FAIL
        case ProducerCryptoFailureAction.SEND =>
            pb.ProducerCryptoFailureAction.PRODUCER_CRYPTO_FAILURE_ACTION_SEND

    def consumerCryptoFailureActionToPb(consumer: ConsumerCryptoFailureAction): pb.ConsumerCryptoFailureAction = consumer match
        case ConsumerCryptoFailureAction.FAIL =>
            pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_FAIL
        case ConsumerCryptoFailureAction.CONSUME =>
            pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_CONSUME
        case ConsumerCryptoFailureAction.DISCARD =>
            pb.ConsumerCryptoFailureAction.CONSUMER_CRYPTO_FAILURE_ACTION_DISCARD

    def processingGuaranteesToPb(processing: FunctionConfig.ProcessingGuarantees): pb.ProcessingGuarantees = processing match
        case FunctionConfig.ProcessingGuarantees.ATMOST_ONCE =>
            pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATMOST_ONCE
        case FunctionConfig.ProcessingGuarantees.ATLEAST_ONCE =>
            pb.ProcessingGuarantees.PROCESSING_GUARANTEES_ATLEAST_ONCE
        case FunctionConfig.ProcessingGuarantees.EFFECTIVELY_ONCE =>
            pb.ProcessingGuarantees.PROCESSING_GUARANTEES_EFFECTIVELY_ONCE

    def classNameToPb(className: String): pb.ClassName = className match
        case "org.apache.pulsar.io.aerospike.AerospikeStringSink" => pb.ClassName.CLASS_NAME_AEROSPIKE_STRING_SINK
        case "org.apache.pulsar.io.alluxio.sink.AlluxioSink" => pb.ClassName.CLASS_NAME_ALLUXIO_SINK
        case "org.apache.pulsar.io.cassandra.CassandraStringSink" => pb.ClassName.CLASS_NAME_CASSANDRA_STRING_SINK
        case "org.apache.pulsar.io.elasticsearch.ElasticSearchSink" => pb.ClassName.CLASS_NAME_ELASTIC_SEARCH_SINK
        case "org.apache.pulsar.io.flume.sink.StringSink" => pb.ClassName.CLASS_NAME_STRING_SINK
        case "org.apache.pulsar.io.hbase.HbaseAbstractConfig" => pb.ClassName.CLASS_NAME_HBASE_ABSTRACT_CONFIG
        case "org.apache.pulsar.io.hdfs2.AbstractHdfsConnector" => pb.ClassName.CLASS_NAME_ABSTRACT_HDFS2_CONNECTOR
        case "org.apache.pulsar.io.hdfs3.AbstractHdfsConnector" => pb.ClassName.CLASS_NAME_ABSTRACT_HDFS3_CONNECTOR
        case "org.apache.pulsar.io.http.HttpSink" => pb.ClassName.CLASS_NAME_HTTP_SINK
        case "org.apache.pulsar.io.influxdb.InfluxDBGenericRecordSink" => pb.ClassName.CLASS_NAME_INFLUXDB_GENERIC_RECORD_SINK
        case "org.apache.pulsar.io.jdbc.ClickHouseJdbcAutoSchemaSink" => pb.ClassName.CLASS_NAME_CLICK_HOUSE_JDBC_AUTO_SCHEMA_SINK
        case "org.apache.pulsar.io.jdbc.MariadbJdbcAutoSchemaSink" => pb.ClassName.CLASS_NAME_MARIADB_JDBC_AUTO_SCHEMA_SINK
        case "org.apache.pulsar.io.jdbc.OpenMLDBJdbcAutoSchemaSink" => pb.ClassName.CLASS_NAME_OPEN_MLDB_JDBC_AUTO_SCHEMA_SINK
        case "org.apache.pulsar.io.jdbc.PostgresJdbcAutoSchemaSink" => pb.ClassName.CLASS_NAME_POSTGRES_JDBC_AUTO_SCHEMA_SINK
        case "org.apache.pulsar.io.jdbc.SqliteJdbcAutoSchemaSink" => pb.ClassName.CLASS_NAME_SQLITE_JDBC_AUTO_SCHEMA_SINK
        case "org.apache.pulsar.io.kafka.KafkaAbstractSink" => pb.ClassName.CLASS_NAME_KAFKA_ABSTRACT_SINK
        case "org.apache.pulsar.io.kinesis.KinesisSink" => pb.ClassName.CLASS_NAME_KINESIS_SINK
        case "org.apache.pulsar.io.mongodb.MongoSink" => pb.ClassName.CLASS_NAME_MONGO_SINK
        case "org.apache.pulsar.io.rabbitmq.RabbitMQSink" => pb.ClassName.CLASS_NAME_RABBIT_MQ_SINK
        case "org.apache.pulsar.io.redis.RedisAbstractConfig" => pb.ClassName.CLASS_NAME_REDIS_ABSTRACT_CONFIG
        case "org.apache.pulsar.io.solr.SolrSinkConfig" => pb.ClassName.CLASS_NAME_SOLR_SINK_CONFIG

    def sinkTypeToPb(sinkType: String): pb.SinkType = sinkType match
        case "aerospike" => pb.SinkType.SINK_TYPE_AEROSPIKE
        case "alluxio" => pb.SinkType.SINK_TYPE_ALLUXIO
        case "cassandra" => pb.SinkType.SINK_TYPE_CASSANDRA
        case "elastic_search" => pb.SinkType.SINK_TYPE_ELASTIC_SEARCH
        case "flume" => pb.SinkType.SINK_TYPE_FLUME
        case "hbase" => pb.SinkType.SINK_TYPE_HBASE
        case "hdfs2" => pb.SinkType.SINK_TYPE_HDFS2
        case "hdfs3" => pb.SinkType.SINK_TYPE_HDFS3
        case "http" => pb.SinkType.SINK_TYPE_HTTP
        case "influxdb" => pb.SinkType.SINK_TYPE_INFLUXDB_V1
        case "jdbc-clickhouse" => pb.SinkType.SINK_TYPE_JDBC_CLICK_HOUSE
        case "jdbc-sqlite" => pb.SinkType.SINK_TYPE_JDBC_SQLITE
        case "jdbc-mariadb" => pb.SinkType.SINK_TYPE_JDBC_MARIA_DB
        case "jdbc-open-mldb" => pb.SinkType.SINK_TYPE_JDBC_OPEN_MLDB
        case "jdbc-postgres" => pb.SinkType.SINK_TYPE_JDBC_POSTRGRES
        case "kafka" => pb.SinkType.SINK_TYPE_KAFKA
        case "kinesis" => pb.SinkType.SINK_TYPE_KINESIS
        case "mongodb" => pb.SinkType.SINK_TYPE_MONGODB
        case "rabbitmq" => pb.SinkType.SINK_TYPE_RABBITMQ
        case "redis" => pb.SinkType.SINK_TYPE_REDIS
        case "solr" => pb.SinkType.SINK_TYPE_SOLR
        case _ => pb.SinkType.SINK_TYPE_UNSPECIFIED

    def convertResourcesToPb(resources: Resources): Option[pb.Resources] =
        Option(pb.Resources(
            cpu = resources.getCpu,
            ram = resources.getRam,
            disk = resources.getDisk,
        ))

    def cryptoConfigConverterToPb(cryptoConfig: CryptoConfig): Option[pb.CryptoConfig] =
        Option(pb.CryptoConfig(
            cryptoKeyReaderClassName = cryptoConfig.getCryptoKeyReaderClassName,
            cryptoKeyReaderConfig = cryptoConfig.getCryptoKeyReaderConfig.toString,
            encryptionKeys = cryptoConfig.getEncryptionKeys,
            producerCryptoFailureAction = producerCryptoFailureActionToPb(cryptoConfig.getProducerCryptoFailureAction),
            consumerCryptoFailureAction = consumerCryptoFailureActionToPb(cryptoConfig.getConsumerCryptoFailureAction),
        ))
    def convertInputSpecs(inputsSpecs: Map[String, ConsumerConfig]): Map[String, pb.InputsSpecs] =
        var inputSpecs = Map[String, pb.InputsSpecs]()
        inputsSpecs.foreach((specs, configs) =>
            inputSpecs = inputSpecs + (specs -> pb.InputsSpecs(
                schemaType = if configs.getSchemaType == null then "" else configs.getSchemaType,
                serdeClassName = if configs.getSerdeClassName == null then "" else configs.getSerdeClassName,
                isRegexPattern = configs.isRegexPattern,
                schemaProperties = if configs.getSchemaProperties == null then Map() else configs.getSchemaProperties.asScala.toMap,
                consumerProperties = if configs.getConsumerProperties == null then Map() else configs.getConsumerProperties.asScala.toMap,
                receiverQueueSize = if configs.getReceiverQueueSize == null then 0 else configs.getReceiverQueueSize,
                cryptoConfig = if configs.getCryptoConfig == null then Option(pb.CryptoConfig()) else cryptoConfigConverterToPb(configs.getCryptoConfig),
                poolMessages = configs.isPoolMessages,
            )))
        inputSpecs

    override def getSink(request: pb.GetSinkRequest): Future[pb.GetSinkResponse] =
        try {
            val sink = adminClient.sinks.getSink(request.tenant, request.namespace, request.sink)

            val sinkConfig = Option(pb.SinkConfig (
                tenant = sink.getTenant,
                namespace = sink.getNamespace,
                name = sink.getName,
                inputs = if sink.getInputs == null then Seq() else sink.getInputs.asScala.toSeq,
                sourceSubscriptionName = if sink.getSourceSubscriptionName == null then "" else sink.getSourceSubscriptionName,
                sourceSubscriptionPosition = subscriptionInitialPositionToPb(sink.getSourceSubscriptionPosition),
                topicsPattern = if sink.getTopicsPattern == null then "" else sink.getTopicsPattern,
                topicToSchemaProperties = if sink.getTopicToSchemaProperties == null then Map() else sink.getTopicToSchemaProperties.asScala.toMap,
                inputSpecs = if sink.getInputSpecs == null then Map() else convertInputSpecs(sink.getInputSpecs.asScala.toMap), //inputSpecs
                maxMessageRetries = if sink.getMaxMessageRetries == null then 0 else sink.getMaxMessageRetries,
                deadLetterTopic = if sink.getDeadLetterTopic == null then "" else sink.getDeadLetterTopic,
                parallelism = if sink.getParallelism == null then 0 else sink.getParallelism,
                processingGuarantees = processingGuaranteesToPb(sink.getProcessingGuarantees),
                retainOrdering = sink.getRetainOrdering,
                retainKeyOrdering = sink.getRetainKeyOrdering,
                autoAck = sink.getAutoAck,
                timeoutMs = sink.getTimeoutMs,
                negativeAckRedeliveryDelayMs = sink.getNegativeAckRedeliveryDelayMs,
                cleanupSubscription = sink.getCleanupSubscription,
                sinkType = sinkTypeToPb(sink.getSinkType),
                className = classNameToPb(sink.getClassName),
                topicToSerdeClassName = if sink.getTopicToSerdeClassName == null then Map() else sink.getTopicToSerdeClassName.asScala.toMap,
                topicToSchemaType = if sink.getTopicToSchemaType == null then Map() else sink.getTopicToSchemaType.asScala.toMap,
//                configs = if sink.getConfigs == null then "" else sink.getConfigs.toString,
                secrets = if sink.getSecrets == null then "" else sink.getSecrets.toString,
                resources = convertResourcesToPb(sink.getResources),
                archive = if sink.getArchive == null then "" else sink.getArchive,
                runtimeFlags = if sink.getRuntimeFlags == null then "" else sink.getRuntimeFlags,
                customRuntimeOptions = if sink.getCustomRuntimeOptions == null then "" else sink.getCustomRuntimeOptions,
            ))

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.GetSinkResponse(status = Some(status), sinkConfig = sinkConfig))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetSinkResponse(status = Some(status)))
        }

    override def updateSink(request: pb.UpdateSinkRequest): Future[pb.UpdateSinkResponse] =
        try {
            request.sinkConfig match
                case Some(v) =>
                    val sinkConfig = SinkConfig(
                        tenant = v.tenant,
                        namespace = v.namespace,
                        name = v.name,
                        inputs = v.inputs.asJavaCollection,
                        sourceSubscriptionName = if v.sourceSubscriptionName.isEmpty then null else v.sourceSubscriptionName,
                        sourceSubscriptionPosition = subscriptionInitialPositionFromPb(v.sourceSubscriptionPosition),
                        topicsPattern = if v.topicsPattern.isEmpty then null else v.topicsPattern,
                        topicToSchemaProperties = if v.topicToSchemaProperties.size > 0 then v.topicToSchemaProperties.asJava else null,
                        inputSpecs = if v.inputSpecs.size > 0 then convertInputSpecs(v.inputSpecs) else null,
                        maxMessageRetries = if v.maxMessageRetries > 0 then v.maxMessageRetries else null,
                        deadLetterTopic = if v.deadLetterTopic.length > 0 then v.deadLetterTopic else null,
                        parallelism = if v.parallelism > 0 then v.parallelism else null,
                        processingGuarantees = processingGuaranteesFromPb(v.processingGuarantees),
                        retainOrdering = v.retainOrdering,
                        retainKeyOrdering = v.retainKeyOrdering,
                        autoAck = v.autoAck,
                        timeoutMs = if v.timeoutMs > 0 then v.timeoutMs else null,
                        negativeAckRedeliveryDelayMs = if v.negativeAckRedeliveryDelayMs > 0 then v.negativeAckRedeliveryDelayMs else null,
                        cleanupSubscription = v.cleanupSubscription,
                        sinkType = sinkTypeFromPb(v.sinkType),
                        className = classNameFromPb(v.className),
                        topicToSerdeClassName = if v.topicToSerdeClassName.isEmpty then null else v.topicToSerdeClassName.asJava,
                        topicToSchemaType = if v.topicToSchemaType.isEmpty then null else v.topicToSchemaType.asJava,
                        configs = if v.configs.isEmpty then null else parseConfigs(v.configs),
                        secrets = if v.secrets.isEmpty then null else parseConfigs(v.secrets),
                        resources = convertResourcesFromPb(v.resources),
                        archive = if v.archive.isEmpty then null else v.archive,
                        runtimeFlags = if v.runtimeFlags.isEmpty then null else v.runtimeFlags,
                        customRuntimeOptions = if v.customRuntimeOptions.isEmpty then null else v.customRuntimeOptions,
                    )

                    v.pathToConnector match
                        case Some(v) =>
                            if (pathToConnectorFromPb(v.`type`) == "url") {
                                adminClient.sinks.updateSinkWithUrl(sinkConfig, v.path)
                            } else {
                                adminClient.sinks.updateSink(sinkConfig, v.path)
                            }

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.UpdateSinkResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.UpdateSinkResponse(status = Some(status)))
        }

    override def deleteSink(request: pb.DeleteSinkRequest): Future[pb.DeleteSinkResponse] =
        try {
            adminClient.sinks.deleteSink(request.tenant, request.namespace, request.sink)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteSinkResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteSinkResponse(status = Some(status)))
        }

    def convertProducerConfigFromPb(producerConfig: Option[pb.ProducerConfig]): ProducerConfig =
        producerConfig match
            case Some(v) =>
                ProducerConfig (
                    maxPendingMessages = v.maxPendingMessages,
                    maxPendingMessagesAcrossPartitions = v.maxPendingMessagesAcrossPartitions,
                    useThreadLocalProducers = v.useThreadLocalProducers,
                    cryptoConfig = cryptoConfigConverterFromPb(v.cryptoConfig),
                    batchBuilder = v.batchBuilder,

                )

    def convertBatchSourceConfigFromPb(batchSourceConfig: Option[pb.BatchSourceConfig]): BatchSourceConfig =
        batchSourceConfig match
            case Some(v) =>
                BatchSourceConfig (
                    discoveryTriggererClassName = v.discoveryTriggererClassName,
                    discoveryTriggererConfig = parseConfigs(v.discoveryTriggererConfig)
                )

    def convertBatchSourceConfigToPb(batchSourceConfig: BatchSourceConfig): Option[pb.BatchSourceConfig] =
        Option(pb.BatchSourceConfig(
            discoveryTriggererClassName = batchSourceConfig.getDiscoveryTriggererClassName,
            discoveryTriggererConfig = batchSourceConfig.getDiscoveryTriggererConfig.toString,
        ))

    def sourceClassNameFromPb(className: pb.SourceClassName): String = className match
        case pb.SourceClassName.SOURCE_CLASS_NAME_CANAL => "org.apache.pulsar.io.canal.CanalStringSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_MY_SQL => "org.apache.pulsar.io.debezium.mysql.DebeziumMysqlSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_POSTGRES => "org.apache.pulsar.io.debezium.postgres.DebeziumPostgresSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_MONGO_DB => "org.apache.pulsar.io.debezium.mongodb.DebeziumMongoDbSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_ORACLE => "org.apache.pulsar.io.debezium.oracle.DebeziumOracleSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_MS_SQL => "org.apache.pulsar.io.debezium.mssql.DebeziumMsSqlSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_DYNAMO_DB => "org.apache.pulsar.io.dynamodb.DynamoDBSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_FILE => "org.apache.pulsar.io.file.FileSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_FLUME => "org.apache.pulsar.io.flume.FlumeConnector"
        case pb.SourceClassName.SOURCE_CLASS_NAME_TWITTER_FIRE_HOUSE => "org.apache.pulsar.io.twitter.TwitterFireHose"
        case pb.SourceClassName.SOURCE_CLASS_NAME_KAFKA_ABSTRACT => "org.apache.pulsar.io.kafka.KafkaAbstractSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_KINESIS => "org.apache.pulsar.io.kinesis.KinesisSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_MONGO => "org.apache.pulsar.io.mongodb.MongoSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_NETTY => "org.apache.pulsar.io.netty.NettySource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_NSQ => "org.apache.pulsar.io.nsq.NSQSource"
        case pb.SourceClassName.SOURCE_CLASS_NAME_RABBIT_MQ => "org.apache.pulsar.io.rabbitmq.RabbitMQSource"

    def sourceClassNameToPb(className: String): pb.SourceClassName = className match
        case "org.apache.pulsar.io.canal.CanalStringSource" => pb.SourceClassName.SOURCE_CLASS_NAME_CANAL
        case "org.apache.pulsar.io.debezium.mysql.DebeziumMysqlSource" => pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_MY_SQL
        case "org.apache.pulsar.io.debezium.postgres.DebeziumPostgresSource" => pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_POSTGRES
        case "org.apache.pulsar.io.debezium.mongodb.DebeziumMongoDbSource" => pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_MONGO_DB
        case "org.apache.pulsar.io.debezium.oracle.DebeziumOracleSource" => pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_ORACLE
        case "org.apache.pulsar.io.debezium.mssql.DebeziumMsSqlSource" => pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_MS_SQL
        case "org.apache.pulsar.io.dynamodb.DynamoDBSource" => pb.SourceClassName.SOURCE_CLASS_NAME_DYNAMO_DB
        case "org.apache.pulsar.io.file.FileSource" => pb.SourceClassName.SOURCE_CLASS_NAME_FILE
        case "org.apache.pulsar.io.flume.FlumeConnector" => pb.SourceClassName.SOURCE_CLASS_NAME_FLUME
        case "org.apache.pulsar.io.twitter.TwitterFireHose" => pb.SourceClassName.SOURCE_CLASS_NAME_TWITTER_FIRE_HOUSE
        case "org.apache.pulsar.io.kafka.KafkaAbstractSource" => pb.SourceClassName.SOURCE_CLASS_NAME_KAFKA_ABSTRACT
        case "org.apache.pulsar.io.kinesis.KinesisSource" => pb.SourceClassName.SOURCE_CLASS_NAME_KINESIS
        case "org.apache.pulsar.io.mongodb.MongoSource" => pb.SourceClassName.SOURCE_CLASS_NAME_MONGO
        case "org.apache.pulsar.io.netty.NettySource" => pb.SourceClassName.SOURCE_CLASS_NAME_NETTY
        case "org.apache.pulsar.io.nsq.NSQSource" => pb.SourceClassName.SOURCE_CLASS_NAME_NSQ
        case "org.apache.pulsar.io.rabbitmq.RabbitMQSource" => pb.SourceClassName.SOURCE_CLASS_NAME_RABBIT_MQ


    override def createSource(request: pb.CreateSourceRequest): Future[pb.CreateSourceResponse] =
        try {
            request.source match
                case Some(v) =>
                    val source = SourceConfig(
                        tenant = "public", // v.tenant,
                        namespace = "default", // v.namespace,
                        name = v.name,
                        className = sourceClassNameFromPb(pb.SourceClassName.SOURCE_CLASS_NAME_DEBEZIUM_POSTGRES), // "org.apache.pulsar.io.debezium.DebeziumSource.DebeziumPostgresSource", //v.className,
                        topicName = "myTopic", // v.topicName,
                        producerConfig = convertProducerConfigFromPb(v.producerConfig),
                        serdeClassName = v.serdeClassName,
                        schemaType = "AVRO", // v.schemaType,
                        configs = parseConfigs(v.configs),
                        secrets = parseConfigs(v.secrets),
                        parallelism = 1, // v.parallelism,
                        processingGuarantees = processingGuaranteesFromPb(v.processingGuarantees),
                        resources = convertResourcesFromPb(v.resources),
                        archive = "connectors/pulsar-io-debezium-postgres-2.11.0.nar", // v.archive,
                        runtimeFlags = v.runtimeFlags,
                        customRuntimeOptions = v.customRuntimeOptions,
                        batchSourceConfig = convertBatchSourceConfigFromPb(v.batchSourceConfig),
                        batchBuilder = v.batchBuilder,
                    )

                    println(source)

                    adminClient.sources.createSourceWithUrl(source, "https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-debezium-postgres-2.11.0.nar")

//                    if v.archive matches "https*" then
//                        adminClient.sources.createSourceWithUrl(source, v.archive)
//                    else
//                        adminClient.sources.createSource(source, v.archive)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.CreateSourceResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateSourceResponse(status = Some(status)))
        }

    override def getListSources(request: pb.GetListSourcesRequest): Future[pb.GetListSourcesResponse] =
        try {
//            var sourcesSeq = Seq[pb.Source]()
//            val sources = adminClient.sources.listSources(request.tenant, request.namespace).asScala.toSeq
//
//            sources.foreach(source =>
//                val sourceStatus = adminClient.sources.getSourceStatus(request.tenant, request.namespace, source)
//                var running = 0
//                var numReads: Long = 0
//                var numWrites: Long = 0
//
//                sourceStatus.instances.asScala.foreach(instance =>
//                    if (instance.status.running) {
//                        running += 1
//                    }
//                    numReads = numReads + instance.status.numRestarts //numReadFromPulsar.toInt
//                    numWrites = numWrites + instance.status.numWritten
//                )
//
//                sourcesSeq = sourcesSeq :+ pb.Source(
//                    name = source,
//                    numInstances = sourceStatus.numInstances,
//                    numRunning = sourceStatus.numRunning,
//                    running = running,
//                    reads = numReads,
//                    writes = numWrites,
//                )
//            )
            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.GetListSourcesResponse(status = Some(status) )) // , sources = sources
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetListSourcesResponse(status = Some(status)))
        }

    def convertProducerConfigToPb(producerConfig: ProducerConfig): Option[pb.ProducerConfig] =
        Option(pb.ProducerConfig(
            maxPendingMessages = producerConfig.getMaxPendingMessages,
            maxPendingMessagesAcrossPartitions = producerConfig.getMaxPendingMessagesAcrossPartitions,
            useThreadLocalProducers = producerConfig.getUseThreadLocalProducers,
            cryptoConfig = cryptoConfigConverterToPb(producerConfig.getCryptoConfig),
            batchBuilder = producerConfig.getBatchBuilder,
        ))
    override def getSource(request: pb.GetSourceRequest): Future[pb.GetSourceResponse] =
        try {
            val source = adminClient.sources.getSource(request.tenant, request.namespace, request.source)

            val pbSource = Option(pb.Source(
                tenant = source.getTenant,
                namespace = source.getNamespace,
                name = source.getName,
                className = sourceClassNameToPb(source.getClassName),
                topicName = source.getTopicName,
                producerConfig = convertProducerConfigToPb(source.getProducerConfig),
                serdeClassName = source.getSerdeClassName,
                schemaType = source.getSchemaType,
                configs = source.getConfigs.toString,
                secrets = source.getSecrets.toString,
                parallelism = source.getParallelism,
                processingGuarantees = processingGuaranteesToPb(source.getProcessingGuarantees),
                resources = convertResourcesToPb(source.getResources),
                archive = source.getArchive,
                runtimeFlags = source.getRuntimeFlags,
                customRuntimeOptions = source.getCustomRuntimeOptions,
                batchSourceConfig = convertBatchSourceConfigToPb(source.getBatchSourceConfig),
                batchBuilder = source.getBatchBuilder,
            ))

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.GetSourceResponse(status = Some(status), source = pbSource))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetSourceResponse(status = Some(status)))
        }

    override def updateSource(request: pb.UpdateSourceRequest): Future[pb.UpdateSourceResponse] =
        try {
            request.source match
                case Some(v) =>
                    val source = SourceConfig(
                        tenant = v.tenant,
                        namespace = v.namespace,
                        name = v.name,
                        className = sourceClassNameFromPb(v.className),
                        topicName = v.topicName,
                        producerConfig = convertProducerConfigFromPb(v.producerConfig),
                        serdeClassName = v.serdeClassName,
                        schemaType = v.schemaType,
                        configs = parseConfigs(v.configs),
                        secrets = parseConfigs(v.secrets),
                        parallelism = v.parallelism,
                        processingGuarantees = processingGuaranteesFromPb(v.processingGuarantees),
                        resources = convertResourcesFromPb(v.resources),
                        archive = v.archive,
                        runtimeFlags = v.runtimeFlags,
                        customRuntimeOptions = v.customRuntimeOptions,
                        batchSourceConfig = convertBatchSourceConfigFromPb(v.batchSourceConfig),
                        batchBuilder = v.batchBuilder,
                    )

                    if v.archive matches "https*" then
                        adminClient.sources.createSourceWithUrl(source, v.archive)
                    else
                        adminClient.sources.createSource(source, v.archive)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.UpdateSourceResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.UpdateSourceResponse(status = Some(status)))
        }
    override def deleteSource(request: pb.DeleteSourceRequest): Future[pb.DeleteSourceResponse] =
        try {
            adminClient.sources.deleteSource(request.tenant, request.namespace, request.source)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteSourceResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteSourceResponse(status = Some(status)))
        }
