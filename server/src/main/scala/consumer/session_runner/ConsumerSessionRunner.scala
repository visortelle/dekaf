package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.session_config.ConsumerSessionConfig
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{Consumer, PulsarClient}
import java.io.ByteArrayOutputStream
import com.google.rpc.code.Code
import com.google.rpc.status.Status

type ConsumerSessionTargetId = String

case class ConsumerSessionRunner(
    sessionName: String,
    sessionConfig: ConsumerSessionConfig,
    sessionContext: ConsumerSessionContext,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]],
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetId, ConsumerSessionTargetRunner]
) {
    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]
    ): Unit =
        this.grpcResponseObserver = Some(grpcResponseObserver)

        def onNext(msg: Option[consumerPb.Message], stats: ConsumerSessionTargetStats, errors: List[String]): Unit =
            val statusPb: Status = errors.length match
                case 0 => Status(code = Code.OK.index)
                case _ => Status(code = Code.INVALID_ARGUMENT.index, message = errors.mkString("\n"))

            val resumeResponsePb = consumerPb.ResumeResponse(
                messages = Seq.from(msg),
                processedMessages = 0,
                status = Some(statusPb),
            )
            grpcResponseObserver.onNext(resumeResponsePb)

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
            val targetName = s"target-$i"

            targetName -> ConsumerSessionTargetRunner.make(
                sessionName = sessionName,
                targetName = targetName,
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                schemasByTopic = Map.empty,
                sessionContext = sessionContext,
                targetConfig = targetConfig
            )
        }.toMap

        val nonPartitionedTopicFqns = targets.values.flatMap(_.nonPartitionedTopicFqns).toVector
        val schemasByTopic = getSchemasByTopic(adminClient, nonPartitionedTopicFqns)

        targets = targets.map { case (targetId, target) =>
            targetId -> target.copy(schemasByTopic = schemasByTopic)
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
