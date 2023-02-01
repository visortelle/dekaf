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


                    def cryptoConfig(cryptoConfig: Option[pb.CryptoConfig]): CryptoConfig = cryptoConfig match
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
                            cryptoConfig = cryptoConfig(configs.cryptoConfig),
                            poolMessages = configs.poolMessages,
                        )))

                    val resources = v.resources match
                        case Some(v) => Resources(
                            cpu = v.cpu,
                            ram = v.ram,
                            disk = v.disk,
                        )

                    SinkConfig(
                        tenant = v.tenant,
                        namespace = v.namespace,
                        name = v.name,
                        className = v.className,
                        sourceSubscriptionName = v.sourceSubscriptionName,
                        sourceSubscriptionPosition = subscriptionInitialPositionFromPb(v.sourceSubscriptionPosition),
                        inputs = v.inputs.asJavaCollection,
                        topicToSerdeClassName = v.topicToSerdeClassName.asJava,
                        topicsPattern = v.topicsPattern,
                        topicToSchemaType =  v.topicToSchemaType.asJava,
                        topicToSchemaProperties = v.topicToSchemaProperties.asJava,
                        inputSpecs = inputSpecs.asJava,
                        maxMessageRetries = v.maxMessageRetries,
                        deadLetterTopic = v.deadLetterTopic,
                        configs = parseConfigs(v.configs).toMap.asJava,
                        secrets = parseConfigs(v.secrets).toMap.asJava,
                        parallelism = v.parallelism,
                        processingGuarantees = processingGuaranteesFromPb(v.processingGuarantees),
                        retainOrdering = v.retainOrdering,
                        retainKeyOrdering = v.retainKeyOrdering,
                        resources = resources,
                        autoAck = v.autoAck,
                        timeoutMs = v.timeoutMs,
                        negativeAckRedeliveryDelayMs = v.negativeAckRedeliveryDelayMs,
                        archive = v.archive,
                        cleanupSubscription = v.cleanupSubscription,
                        runtimeFlags = v.runtimeFlags,
                        customRuntimeOptions = v.customRuntimeOptions,
                    )

            adminClient.sinks.createSink(sinkConfig, request.fileName)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.CreateSinkResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateSinkResponse(status = Some(status)))
        }
