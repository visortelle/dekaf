package main

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.consumer.ConsumerServiceGrpc
import io.grpc.{Server, ServerBuilder}
import scala.concurrent.{ExecutionContext, Future}
import io.grpc.protobuf.services.ProtoReflectionService
import com.typesafe.scalalogging.Logger
import _root_.client.config
import _root_.consumer.ConsumerServiceImpl

@main def main: Unit =
    val logger = Logger(getClass.getName)
    println("Starting Pulsar X-Ray server")
    server.start
    server.awaitTermination

val server = ServerBuilder
    .forPort(config.grpcPort)
    .addService(ConsumerServiceGrpc.bindService(ConsumerServiceImpl(), ExecutionContext.global))
    .addService(ProtoReflectionService.newInstance)
    .build
