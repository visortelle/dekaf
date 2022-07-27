package main

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.consumer.ConsumerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.producer.ProducerServiceGrpc
import com.tools.teal.pulsar.ui.api.v1.schema.SchemaServiceGrpc
import io.grpc.{Server, ServerBuilder}

import scala.concurrent.{ExecutionContext, Future}
import io.grpc.protobuf.services.ProtoReflectionService
import com.typesafe.scalalogging.Logger
import _root_.client.config
import _root_.consumer.ConsumerServiceImpl
import _root_.topic.TopicServiceImpl
import _root_.producer.ProducerServiceImpl
import _root_.schema.SchemaServiceImpl
import com.tools.teal.pulsar.ui.api.v1.topic.TopicServiceGrpc

@main def main: Unit =
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
    .addService(ProtoReflectionService.newInstance)
    .build
