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
    sessionContext: ConsumerSessionContext,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]],
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner],
    var lastTouched: Long, // For consumer session garbage collection
    var numMessageProcessed: Long = 0,
    var numMessageSent: Long = 0
):
    private def actualizeLastTouched(): Unit = lastTouched = System.currentTimeMillis()

    def incrementNumMessageProcessed(): Unit = numMessageProcessed = numMessageProcessed + 1
    def isIdle: Boolean = System.currentTimeMillis() - lastTouched > 1000 * 60 * 10

    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse],
        isDebug: Boolean
    ): Unit =
        this.grpcResponseObserver = Some(grpcResponseObserver)
        actualizeLastTouched()

        def onNext(
            messageFromTarget: Option[ConsumerSessionMessage],
            sessionContext: ConsumerSessionContext,
            stats: ConsumerSessionTargetStats,
            errors: Vector[String]
        ): Unit = boundary:
            def createAndSendResponse(messages: Seq[consumerPb.Message], additionalErrors: Vector[String] = Vector.empty): Unit =
                actualizeLastTouched()

                val allErrors = errors ++ additionalErrors

                val status = allErrors.size match
                    case 0 => Status(code = Code.OK.index)
                    case _ => Status(code = Code.UNKNOWN.index, message = allErrors.mkString("\n\n"))

                val response = consumerPb.ResumeResponse(
                    messages = messages,
                    status = Some(status)
                )
                grpcResponseObserver.onNext(response)
                boundary.break(())

            messageFromTarget match
                case None =>
                    val emptyMsgPb = consumerPb.Message(
                        numMessageProcessed = numMessageProcessed,
                        numMessageSent = numMessageSent
                    )
                    createAndSendResponse(Seq(emptyMsgPb), errors)

                case Some(msg) =>
                    val messageFilterChainResult = sessionContext.testMessageFilterChain(
                        sessionConfig.messageFilterChain
                    )

                    if !messageFilterChainResult.isOk then
                        createAndSendResponse(Seq.empty)

                    val coloringRuleChainResult: Vector[ChainTestResult] = if sessionConfig.coloringRuleChain.isEnabled then
                        sessionConfig.coloringRuleChain.coloringRules
                            .filter(_.isEnabled)
                            .map(cr => sessionContext.testMessageFilterChain(cr.messageFilterChain))
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

                    numMessageSent = numMessageSent + 1

                    val messageToSendPb = msg.messagePb
                        .withSessionContextStateJson(sessionContext.getState)
                        .withDebugStdout(msg._1.debugStdout.getOrElse("") + "\n" + sessionContext.getStdout)
                        .withSessionMessageFilterChainTestResult(ChainTestResult.toPb(messageFilterChainResult))
                        .withSessionColorRuleChainTestResults(coloringRuleChainResult.map(ChainTestResult.toPb))
                        .withSessionValueProjectionListResult(valueProjectionListResult.map(ValueProjectionResult.toPb))
                        .withNumMessageSent(numMessageSent)
                        .withNumMessageProcessed(numMessageProcessed)

                    createAndSendResponse(Seq(messageToSendPb), errors)

        targets.values.foreach(_.resume(
            onNext = onNext,
            isDebug = isDebug,
            incrementNumMessageProcessed = incrementNumMessageProcessed
        ))

    def pause(): Unit =
        actualizeLastTouched()
        targets.values.foreach(_.pause())

    def close(): Unit =
        actualizeLastTouched()
        pause()
        targets.values.foreach(_.close())
        sessionContext.close()

object ConsumerSessionRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionName: String,
        sessionConfig: ConsumerSessionConfig
    ): ConsumerSessionRunner =
        val sessionContext = ConsumerSessionContextPool.getContext

        var targets = sessionConfig.targets
            .filter(_.isEnabled)
            .zipWithIndex.map { case (targetConfig, i) =>
                i -> ConsumerSessionTargetRunner.make(
                    sessionName = sessionName,
                    targetIndex = i,
                    pulsarClient = pulsarClient,
                    adminClient = adminClient,
                    schemasByTopic = Map.empty,
                    sessionContext = sessionContext,
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

        val runner = ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = sessionConfig,
            schemasByTopic = schemasByTopic,
            sessionContext = sessionContext,
            targets = targets,
            grpcResponseObserver = None,
            lastTouched = 0
        )

        runner.actualizeLastTouched()
        runner
