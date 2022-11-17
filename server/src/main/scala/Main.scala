package main

import com.typesafe.scalalogging.Logger
import _root_.server.grpc.server as grpcServer

object Main:
    def main(args: Array[String]): Unit =
        val logger = Logger(getClass.getName)
        logger.info("Starting Pulsar X-Ray server")
        
        grpcServer.start
        grpcServer.awaitTermination

