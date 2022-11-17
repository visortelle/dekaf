package server.grpc

import zio.*
import scala.concurrent.{ExecutionContext, Future}
import io.grpc.{Server, ServerBuilder}
import io.grpc.protobuf.services.ProtoReflectionService

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.consumer.ConsumerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.producer.ProducerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.schema.SchemaServiceGrpc
import com.tools.teal.pulsar.ui.tenant.v1.tenant.TenantServiceGrpc
import com.tools.teal.pulsar.ui.namespace.v1.namespace.NamespaceServiceGrpc
import com.tools.teal.pulsar.ui.cluster.v1.cluster.ClusterServiceGrpc
import com.tools.teal.pulsar.ui.topic.v1.topic.TopicServiceGrpc
import com.tools.teal.pulsar.ui.metrics.v1.metrics.MetricsServiceGrpc
import com.tools.teal.pulsar.ui.brokers.v1.brokers.BrokersServiceGrpc
import com.tools.teal.pulsar.ui.brokerstats.v1.brokerstats.BrokerStatsServiceGrpc
import com.tools.teal.pulsar.ui.topicpolicies.v1.topicpolicies.TopicpoliciesServiceGrpc

import _root_.client.config
import _root_.consumer.ConsumerServiceImpl
import _root_.topic.TopicServiceImpl
import _root_.producer.ProducerServiceImpl
import _root_.schema.SchemaServiceImpl
import _root_.tenant.TenantServiceImpl
import _root_.namespace.NamespaceServiceImpl
import _root_.cluster.ClusterServiceImpl
import _root_.metrics.MetricsServiceImpl
import _root_.brokers.BrokersServiceImpl
import _root_.brokerstats.BrokerStatsServiceImpl
import _root_.topicpolicies.TopicpoliciesServiceImpl

object GrpcServerApp extends ZIOAppDefault:
    private val grpcServer = ServerBuilder
        .forPort(config.grpcPort)
        .addService(ProducerServiceGrpc.bindService(ProducerServiceImpl(), ExecutionContext.global))
        .addService(ConsumerServiceGrpc.bindService(ConsumerServiceImpl(), ExecutionContext.global))
        .addService(TopicServiceGrpc.bindService(TopicServiceImpl(), ExecutionContext.global))
        .addService(TopicpoliciesServiceGrpc.bindService(TopicpoliciesServiceImpl(), ExecutionContext.global))
        .addService(SchemaServiceGrpc.bindService(SchemaServiceImpl(), ExecutionContext.global))
        .addService(TenantServiceGrpc.bindService(TenantServiceImpl(), ExecutionContext.global))
        .addService(NamespaceServiceGrpc.bindService(NamespaceServiceImpl(), ExecutionContext.global))
        .addService(ClusterServiceGrpc.bindService(ClusterServiceImpl(), ExecutionContext.global))
        .addService(MetricsServiceGrpc.bindService(MetricsServiceImpl(), ExecutionContext.global))
        .addService(BrokersServiceGrpc.bindService(BrokersServiceImpl(), ExecutionContext.global))
        .addService(BrokerStatsServiceGrpc.bindService(BrokerStatsServiceImpl(), ExecutionContext.global))
        .addService(ProtoReflectionService.newInstance)
        .build

    val run = for {
        _ <- ZIO.logInfo("Starting gRPC server")
        _ <- ZIO.attempt(grpcServer.start)
    } yield ()
