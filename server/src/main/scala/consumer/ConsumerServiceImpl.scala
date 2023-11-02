package consumer

import zio.*
import zio.concurrent.ConcurrentMap

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success, Try}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import org.apache.pulsar.client.api.{Message, MessageId}
import _root_.pulsar_auth.RequestContext
import com.tools.teal.pulsar.ui.api.v1.consumer.ResumeConsumerSessionResponse

import java.util.concurrent.ConcurrentHashMap
import java.io.ByteArrayOutputStream
import java.util.UUID
import java.time.Instant

case class StreamDataHandler(var onNext: (msg: Message[Array[Byte]]) => Unit)

class ConsumerServiceImpl(sessions: ConcurrentMap[String, ConsumerSession], zioRuntime: Runtime[Any]) extends pb.ConsumerServiceGrpc.ConsumerService:
    private val controller = ConsumerSessionsController(sessions = sessions)

    override def createConsumerSession(request: pb.CreateConsumerSessionRequest): Future[pb.CreateConsumerSessionResponse] = ???

    override def resumeConsumerSession(request: pb.ResumeConsumerSessionRequest, responseObserver: io.grpc.stub.StreamObserver[ResumeConsumerSessionResponse]): Unit = ???

    override def pauseConsumerSession(request: pb.PauseConsumerSessionRequest): Future[pb.PauseConsumerSessionResponse] = ???

    override def deleteConsumerSession(request: pb.DeleteConsumerSessionRequest): Future[pb.DeleteConsumerSessionResponse] = ???

    override def runCode(request: pb.RunCodeRequest): Future[pb.RunCodeResponse] = ???
