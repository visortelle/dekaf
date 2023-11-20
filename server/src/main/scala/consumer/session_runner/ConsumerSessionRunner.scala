package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer.ResumeResponse
import consumer.session_config.ConsumerSessionConfig
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{Consumer, PulsarClient}
import java.io.ByteArrayOutputStream

type ConsumerSessionTargetId = String

case class ConsumerSessionRunner(
    sessionName: String,
    sessionConfig: ConsumerSessionConfig,
    sessionContext: ConsumerSessionContext,
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetId, ConsumerSessionTargetRunner]
) {
    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[ResumeResponse]
    ): Unit =
        targets.values.foreach(_.resume(
            grpcResponseObserver = grpcResponseObserver
        ))
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
            i.toString -> ConsumerSessionTargetRunner.make(
                sessionName = sessionName,
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                schemasByTopic = Map.empty,
                sessionContext = sessionContext,
                grpcResponseObserver = None,
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
            targets = targets
        )
