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
import com.google.gson.JsonParser

import java.util.UUID
import scala.collection.mutable


import io.circe.{Decoder, Encoder, Json}
import io.circe.parser.*
import io.circe.syntax.*
import io.circe.parser.*
import io.circe.generic.semiauto.*
import io.circe._
import io.circe.generic.semiauto._
import io.circe.syntax._


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

//        parse(json) match
//            case Right(v) => v
//            case Left(_) => null

        val mapper = ObjectMapperFactory.getThreadLocal()
        val typeRef = new TypeReference[mutable.HashMap[String, Any]]() {}
        mapper.readValue(json, typeRef)
//        decode[mutable.HashMap[String, Object]](json)


//    protected Map <String, Object> parseConfigs(String str) throws JsonProcessingException {
//        ObjectMapper mapper = ObjectMapperFactory.getThreadLocal();
//        TypeReference <HashMap<String, Object>> typeRef = new TypeReference <HashMap<String, Object>> () {};
//        return mapper.readValue(str, typeRef);
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
                                cryptoKeyReaderConfig = if v.cryptoKeyReaderConfig.length > 0 then parseConfigs(v.cryptoKeyReaderConfig).toMap.asJava else null,
                                encryptionKeys = v.encryptionKeys.toArray,
                                producerCryptoFailureAction = producerCryptoFailureActionFromPb(v.producerCryptoFailureAction),
                                consumerCryptoFailureAction = consumerCryptoFailureActionFromPb(v.consumerCryptoFailureAction),
                            )
                    def pathToConnectorFromPb(pathType: pb.PathType) = pathType match
                        case pb.PathType.PATH_TYPE_URL => "url"
                        case pb.PathType.PATH_TYPE_FOLDER => "folder"

                    val convertedInputSpecs = Map[String, ConsumerConfig]()
                    v.inputSpecs.foreach((specs, configs) =>
                        convertedInputSpecs + (specs -> ConsumerConfig(
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

                    val sinkConfig = SinkConfig(
                        tenant = "public",  //it works              v.tenant,
                        namespace = "default", //it works           v.namespace,
                        name = v.name,
                        inputs = v.inputs.asJavaCollection, //List("persistent://public/default/X").asJava,
//                        Must specify at least one topic of input via
//                            topicToSerdeClassName, topicsPattern, topicToSchemaType or inputs

                        sourceSubscriptionName = v.sourceSubscriptionName,
                        sourceSubscriptionPosition = subscriptionInitialPositionFromPb(v.sourceSubscriptionPosition),
                        topicsPattern = if v.topicsPattern.isEmpty then null else v.topicsPattern,
                        topicToSchemaProperties = if v.topicToSchemaProperties.size > 0 then v.topicToSchemaProperties.asJava else null,
                        inputSpecs = if v.inputs.size > 0 then convertedInputSpecs.asJava else null,
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

                        className = null, // if using archive "org.apache.pulsar.io.cassandra.CassandraStringSink", // v.className,
                        topicToSerdeClassName = null, // v.topicToSerdeClassName.asJava, // ("string" -> desiariliza class)
                        topicToSchemaType = null, // v.topicToSchemaType.asJava, (string -> special class)
                        configs = if v.configs.isEmpty then null else parseConfigs(v.configs).toMap.asJava,
                        secrets = if v.secrets.isEmpty then null else parseConfigs(v.secrets).toMap.asJava,
                        resources = null, // convertedResources -- it works ///only if docker
                        archive = null, //"file:///pulsar/connectors/pulsar-io-cassandra-2.11.0.nar", // connector // null,
                        runtimeFlags = null, // v.runtimeFlags, //special
                        customRuntimeOptions = null, // v.customRuntimeOptions, //special
                    )

                    println(parseConfigs(v.configs).toMap.asJava)

                    v.pathToConnector match
                        case Some(v) =>
                            if (pathToConnectorFromPb(v.`type`) == "url") {
                                adminClient.sinks.createSinkWithUrl(sinkConfig, v.path)
                                println(adminClient.sinks.getSink("public", "default", "users"))
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
