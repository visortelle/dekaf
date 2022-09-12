package main

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.consumer.ConsumerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.producer.ProducerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.schema.SchemaServiceGrpc
import com.tools.teal.pulsar.ui.tenant.v1.tenant.TenantServiceGrpc
import com.tools.teal.pulsar.ui.namespace.v1.namespace.NamespaceServiceGrpc
import com.tools.teal.pulsar.ui.cluster.v1.cluster.ClusterServiceGrpc
import com.tools.teal.pulsar.ui.topic.v1.topic.TopicServiceGrpc
import com.tools.teal.pulsar.ui.metrics.v1.metrics.MetricsServiceGrpc

import io.grpc.{Server, ServerBuilder}

import scala.concurrent.{ExecutionContext, Future}
import io.grpc.protobuf.services.ProtoReflectionService
import com.typesafe.scalalogging.Logger
import _root_.client.config
import _root_.consumer.ConsumerServiceImpl
import _root_.topic.TopicServiceImpl
import _root_.producer.ProducerServiceImpl
import _root_.schema.SchemaServiceImpl
import _root_.tenant.TenantServiceImpl
import _root_.namespace.NamespaceServiceImpl
import _root_.cluster.ClusterServiceImpl
import _root_.metrics.MetricsServiceImpl

object Main:
    def main(args: Array[String]): Unit =
        val logger = Logger(getClass.getName)
        logger.info("Starting Pulsar X-Ray server")
        server.start
        server.awaitTermination

val server = ServerBuilder
    .forPort(config.grpcPort)
    
    .addService(ProducerServiceGrpc.bindService(ProducerServiceImpl(), ExecutionContext.global))
    .addService(ConsumerServiceGrpc.bindService(ConsumerServiceImpl(), ExecutionContext.global))
    .addService(TopicServiceGrpc.bindService(TopicServiceImpl(), ExecutionContext.global))
    .addService(SchemaServiceGrpc.bindService(SchemaServiceImpl(), ExecutionContext.global))

    .addService(TenantServiceGrpc.bindService(TenantServiceImpl(), ExecutionContext.global))
    .addService(NamespaceServiceGrpc.bindService(NamespaceServiceImpl(), ExecutionContext.global))
    .addService(ClusterServiceGrpc.bindService(ClusterServiceImpl(), ExecutionContext.global))
    .addService(MetricsServiceGrpc.bindService(MetricsServiceImpl(), ExecutionContext.global))

    .addService(ProtoReflectionService.newInstance)
    .build
