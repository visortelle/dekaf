package server.grpc

import zio.*

import scala.concurrent.{ExecutionContext, Future}
import io.grpc.{Server, ServerBuilder}
import io.grpc.protobuf.services.ProtoReflectionService
import _root_.config.readConfig

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth.PulsarAuthServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.consumer.ConsumerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.producer.ProducerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.schema.SchemaServiceGrpc
import com.tools.teal.pulsar.ui.tenant.v1.tenant.TenantServiceGrpc
import com.tools.teal.pulsar.ui.namespace.v1.namespace.NamespaceServiceGrpc
import com.tools.teal.pulsar.ui.namespace_policies.v1.namespace_policies.NamespacePoliciesServiceGrpc
import com.tools.teal.pulsar.ui.clusters.v1.clusters.ClustersServiceGrpc
import com.tools.teal.pulsar.ui.topic.v1.topic.TopicServiceGrpc
import com.tools.teal.pulsar.ui.metrics.v1.metrics.MetricsServiceGrpc
import com.tools.teal.pulsar.ui.brokers.v1.brokers.BrokersServiceGrpc
import com.tools.teal.pulsar.ui.brokerstats.v1.brokerstats.BrokerStatsServiceGrpc
import com.tools.teal.pulsar.ui.topic_policies.v1.topic_policies.TopicPoliciesServiceGrpc

import _root_.pulsar_auth.PulsarAuthServiceImpl
import _root_.consumer.ConsumerServiceImpl
import _root_.topic.TopicServiceImpl
import _root_.producer.ProducerServiceImpl
import _root_.schema.SchemaServiceImpl
import _root_.tenant.TenantServiceImpl
import _root_.namespace.NamespaceServiceImpl
import _root_.namespace_policies.NamespacePoliciesServiceImpl
import _root_.clusters.ClustersServiceImpl
import _root_.metrics.MetricsServiceImpl
import _root_.brokers.BrokersServiceImpl
import _root_.brokerstats.BrokerStatsServiceImpl
import _root_.topic_policies.TopicPoliciesServiceImpl
import _root_.pulsar_auth.PulsarAuthInterceptor

object GrpcServer:
    private val pulsarAuthInterceptor = new PulsarAuthInterceptor()

    private def createGrpcServer(port: Int) = ServerBuilder
        .forPort(port)

        .addService(PulsarAuthServiceGrpc.bindService(PulsarAuthServiceImpl(), ExecutionContext.global))
        .addService(ProducerServiceGrpc.bindService(ProducerServiceImpl(), ExecutionContext.global))
        .addService(ConsumerServiceGrpc.bindService(ConsumerServiceImpl(), ExecutionContext.global))
        .addService(TopicServiceGrpc.bindService(TopicServiceImpl(), ExecutionContext.global))
        .addService(TopicPoliciesServiceGrpc.bindService(TopicPoliciesServiceImpl(), ExecutionContext.global))
        .addService(SchemaServiceGrpc.bindService(SchemaServiceImpl(), ExecutionContext.global))
        .addService(TenantServiceGrpc.bindService(TenantServiceImpl(), ExecutionContext.global))
        .addService(NamespaceServiceGrpc.bindService(NamespaceServiceImpl(), ExecutionContext.global))
        .addService(NamespacePoliciesServiceGrpc.bindService(NamespacePoliciesServiceImpl(), ExecutionContext.global))
        .addService(ClustersServiceGrpc.bindService(ClustersServiceImpl(), ExecutionContext.global))
        .addService(MetricsServiceGrpc.bindService(MetricsServiceImpl(), ExecutionContext.global))
        .addService(BrokersServiceGrpc.bindService(BrokersServiceImpl(), ExecutionContext.global))
        .addService(BrokerStatsServiceGrpc.bindService(BrokerStatsServiceImpl(), ExecutionContext.global))

        .addService(ProtoReflectionService.newInstance)

        .intercept(pulsarAuthInterceptor)
        .build

    def run: ZIO[Any, Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internalGrpcPort.get)

        _ <- ZIO.logInfo(s"gRPC server listening port: ${port}")
        server <- ZIO.attempt(createGrpcServer(port))
        _ <- ZIO.attempt(server.start)
        _ <- ZIO.attemptBlockingInterrupt(server.awaitTermination)
    yield ()
