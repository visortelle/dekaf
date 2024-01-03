package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.session_config.ConsumerSessionConfig
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient

import java.io.ByteArrayOutputStream
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import consumer.value_projections.ValueProjectionResult

import scala.util.boundary
import boundary.break

type ConsumerSessionTargetIndex = Int

case class ConsumerSessionRunner(
    sessionName: String,
    sessionConfig: ConsumerSessionConfig,
    sessionContextPool: ConsumerSessionContextPool,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]],
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner]
) {
    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse],
        isDebug: Boolean
    ): Unit =
        this.grpcResponseObserver = Some(grpcResponseObserver)

        def onNext(messageFromTarget: Option[ConsumerSessionMessage], sessionContext: ConsumerSessionContext, stats: ConsumerSessionTargetStats, errors: Vector[String]): Unit = boundary:
            def createAndSendResponse(messages: Seq[consumerPb.Message], additionalErrors: Vector[String] = Vector.empty): Unit =
                val allErrors = errors ++ additionalErrors

                val status = allErrors.size match
                    case 0 => Status(code = Code.OK.index)
                    case _ => Status(code = Code.UNKNOWN.index, message = allErrors.mkString("\n\n"))

                val response = consumerPb.ResumeResponse(
                    messages = messages,
                    processedMessages = 0,
                    status = Some(status)
                )
                grpcResponseObserver.onNext(response)
                boundary.break(())

            messageFromTarget match
                case None =>
                    createAndSendResponse(Seq.empty, errors)

                case Some(msg) =>
                    val messageFilterChainResult = sessionContext.testMessageFilterChain(
                        sessionConfig.messageFilterChain,
                    )

                    if !messageFilterChainResult.isOk then
                        createAndSendResponse(Seq.empty)

                    val coloringRuleChainResult: Vector[ChainTestResult] = if sessionConfig.coloringRuleChain.isEnabled then
                        sessionConfig.coloringRuleChain.coloringRules
                            .filter(_.isEnabled)
                            .map(cr => sessionContext.testMessageFilterChain(
                                cr.messageFilterChain,
                            ))
                    else
                        Vector.empty

                    val valueProjectionListResult: Vector[ValueProjectionResult] = if sessionConfig.valueProjectionList.isEnabled then
                        sessionConfig.valueProjectionList.projections
                            .filter(_.isEnabled)
                            .map(_.project(sessionContext.context))
                    else
                        Vector.empty
                        
                    val errors: Vector[String] = if isDebug then
                        val messageFilterChainErrors = messageFilterChainResult.results.flatMap(r => r.error)
                        val coloringRuleChainErrors = coloringRuleChainResult.flatMap(r => r.results.flatMap(r2 => r2.error))
                        messageFilterChainErrors ++ coloringRuleChainErrors
                    else Vector.empty

                    val messageToSendPb = msg.messagePb
                        .withSessionContextStateJson(sessionContext.getState)
                        .withDebugStdout(msg._1.debugStdout.getOrElse("") + "\n" + sessionContext.getStdout)
                        .withSessionMessageFilterChainTestResult(ChainTestResult.toPb(messageFilterChainResult))
                        .withSessionColorRuleChainTestResults(coloringRuleChainResult.map(ChainTestResult.toPb))
                        .withSessionValueProjectionListResult(valueProjectionListResult.map(ValueProjectionResult.toPb))

                    createAndSendResponse(Seq(messageToSendPb), errors)

        targets.values.foreach(_.resume(onNext = onNext, isDebug = isDebug))
    def pause(): Unit =
        targets.values.foreach(_.pause())
    def stop(): Unit =
        pause()
        targets.values.foreach(_.stop())
}

object ConsumerSessionRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionName: String,
        sessionConfig: ConsumerSessionConfig
    ): ConsumerSessionRunner =
        val sessionContextPool = ConsumerSessionContextPool()

        var targets = sessionConfig.targets.zipWithIndex.map { case (targetConfig, i) =>
            i -> ConsumerSessionTargetRunner.make(
                sessionName = sessionName,
                targetIndex = i,
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                schemasByTopic = Map.empty,
                sessionContextPool = sessionContextPool,
                targetConfig = targetConfig
            )
        }.toMap

        val nonPartitionedTopicFqns = targets.values.flatMap(_.nonPartitionedTopicFqns).toVector
        val schemasByTopic = getSchemasByTopic(adminClient, nonPartitionedTopicFqns)

        targets = targets.map { case (targetIndex, target) =>
            targetIndex -> target.copy(schemasByTopic = schemasByTopic)
        }

        val consumers = targets.values.flatMap(_.consumers).map(_._2).toVector

        handleStartFrom(
            startFrom = sessionConfig.startFrom,
            consumers = consumers,
            adminClient = adminClient,
            pulsarClient = pulsarClient,
            nonPartitionedTopicFqns = nonPartitionedTopicFqns
        )

        ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = sessionConfig,
            schemasByTopic = schemasByTopic,
            sessionContextPool = sessionContextPool,
            targets = targets,
            grpcResponseObserver = None
        )
