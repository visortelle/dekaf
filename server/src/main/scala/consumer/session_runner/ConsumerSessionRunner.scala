package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.session_config.ConsumerSessionConfig
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{Consumer, PulsarClient}
import java.io.ByteArrayOutputStream
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import scala.util.boundary, boundary.break

type ConsumerSessionTargetIndex = Int

case class ConsumerSessionRunner(
    sessionName: String,
    sessionConfig: ConsumerSessionConfig,
    sessionContext: ConsumerSessionContext,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]],
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner]
) {
    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]
    ): Unit =
        this.grpcResponseObserver = Some(grpcResponseObserver)

        def onNext(messageFromTarget: Option[ConsumerSessionMessage], stats: ConsumerSessionTargetStats, errors: List[String]): Unit = boundary:
            def createAndSendResponse(messages: Seq[consumerPb.Message], additionalErrors: List[String] = List.empty): Unit =
                val allErrors = errors ++ additionalErrors
                val status = Status(code = Code.OK.index, message = allErrors.mkString("\n"))

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
                        msg.messageJson,
                        msg.messageValueToJsonResult
                    )

                    if !messageFilterChainResult.isOk then
                        createAndSendResponse(Seq.empty)

                    val coloringRuleChainResult: Vector[ChainTestResult] = if sessionConfig.coloringRuleChain.isEnabled then
                        sessionConfig.coloringRuleChain.coloringRules
                            .filter(cr => cr.isEnabled)
                            .map(cr => sessionContext.testMessageFilterChain(
                                cr.messageFilterChain,
                                msg.messageJson,
                                msg.messageValueToJsonResult
                            ))
                    else
                        Vector.empty

                    val messageToSendPb = msg.messagePb
                        .withSessionContextStateJson(sessionContext.getState())
                        .withDebugStdout(sessionContext.getStdout())
                        .withSessionMessageFilterChainTestResult(ChainTestResult.toPb(messageFilterChainResult))
                        .withSessionColorRuleChainTestResults(coloringRuleChainResult.map(ChainTestResult.toPb))

                    createAndSendResponse(Seq(messageToSendPb))

        targets.values.foreach(_.resume(onNext = onNext))
    def pause(): Unit =
        targets.values.foreach(_.pause())
    def stop(): Unit =
        targets.values.foreach(_.stop())
}

object ConsumerSessionRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionName: String,
        sessionConfig: ConsumerSessionConfig
    ): ConsumerSessionRunner =
        val sessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = new ByteArrayOutputStream()))

        var targets = sessionConfig.targets.zipWithIndex.map { case (targetConfig, i) =>
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

        ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = sessionConfig,
            schemasByTopic = schemasByTopic,
            sessionContext = sessionContext,
            targets = targets,
            grpcResponseObserver = None
        )
