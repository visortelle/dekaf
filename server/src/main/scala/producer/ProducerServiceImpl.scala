package producer

import zio.*
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode, PulsarClient}
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import _root_.schema.avro
import _root_.schema.protobufnative

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import com.google.common.primitives
import com.tools.teal.pulsar.ui.producer.v1.producer.{
    CreateProducerSessionRequest,
    CreateProducerSessionResponse,
    DeleteProducerSessionRequest,
    DeleteProducerSessionResponse,
    GetProducerSessionStatsRequest,
    GetProducerSessionStatsResponse,
    PauseProducerSessionRequest,
    PauseProducerSessionResponse,
    ResumeProducerSessionRequest,
    ResumeProducerSessionResponse
}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import io.circe.*
import io.circe.parser.parse as parseJson
import io.grpc.stub.StreamObserver
import producer.producer_session.ProducerSessionConfig
import producer.producer_session_runner.ProducerSessionRunner
import pulsar_auth.RequestContext

import java.nio.ByteBuffer
import scala.concurrent.Future
import scala.util.boundary
import boundary.break

type ProducerSessionId = String

class ProducerServiceImpl extends pb.ProducerServiceGrpc.ProducerService:
    val logger: Logger = Logger(getClass.getName)
    var sessionRunners: Map[ProducerSessionId, ProducerSessionRunner] = Map.empty
    private val runtime = Runtime.default

    override def createProducerSession(request: CreateProducerSessionRequest): Future[CreateProducerSessionResponse] =
        val pulsarClient = RequestContext.pulsarClient.get()
        val adminClient = RequestContext.pulsarAdmin.get()

        val sessionId = request.sessionId

        try {
            val sessionRunner = ProducerSessionRunner.make(
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                sessionId = request.sessionId,
                sessionConfig = ProducerSessionConfig.fromPb(request.sessionConfig.get)
            )

            sessionRunners += sessionId -> sessionRunner

            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateProducerSessionResponse(status = Some(status)))
        } catch {
            case e: PulsarAdminException =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = e.getMessage)
                Future.successful(CreateProducerSessionResponse(status = Some(status)))
        }

    override def deleteProducerSession(request: DeleteProducerSessionRequest): Future[DeleteProducerSessionResponse] = ???

    override def getProducerSessionStats(request: GetProducerSessionStatsRequest): Future[GetProducerSessionStatsResponse] = ???

    override def pauseProducerSession(request: PauseProducerSessionRequest): Future[PauseProducerSessionResponse] = ???

    override def resumeProducerSession(request: ResumeProducerSessionRequest): Future[ResumeProducerSessionResponse] =
        val sessionId = request.sessionId
        val sessionRunner = sessionRunners.get(sessionId)

        sessionRunner match
            case Some(runner) =>
                try {
                    Unsafe.unsafe(implicit unsafe => runtime.unsafe.run(runner.start()).getOrThrowFiberFailure())

                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(ResumeProducerSessionResponse(status = Some(status)))
                } catch {
                    case e: Throwable =>
                        val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = e.getMessage)
                        Future.successful(ResumeProducerSessionResponse(status = Some(status)))
                }

            case None =>
                val status: Status = Status(code = Code.NOT_FOUND.index)
                Future.successful(ResumeProducerSessionResponse(status = Some(status)))

case class Message(
    key: Option[String],
    value: Array[Byte],
    eventTime: Option[Long],
    properties: Map[String, String]
)

def jsonToValue(schemaInfo: SchemaInfo, jsonAsBytes: Array[Byte]): Either[Throwable, Array[Byte]] =
    val result: Either[Throwable, Array[Byte]] = schemaInfo.getType match
        case SchemaType.AVRO =>
            avro.converters.fromJson(schemaInfo.getSchema, jsonAsBytes) match
                case Right(v)  => Right(v)
                case Left(err) => Left(err)
        case SchemaType.PROTOBUF_NATIVE =>
            protobufnative.converters.fromJson(schemaInfo.getSchema, jsonAsBytes) match
                case Right(v)  => Right(v)
                case Left(err) => Left(err)
        case SchemaType.JSON => Right(jsonAsBytes)
        case SchemaType.STRING =>
            parseJson(String(jsonAsBytes, "UTF-8")) match
                case Left(err) => Left(err)
                case Right(json) if json.isString =>
                    val str = json.asString.getOrElse("")
                    Right(str.getBytes)
                case _ => Left(new Exception("Message should be formatted as JSON string."))
        case SchemaType.NONE => Right(jsonAsBytes)
        case SchemaType.BOOLEAN =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val v: Byte = jsonString match
                case "false" => 0x00.toByte
                case "true"  => 0x01.toByte
                case _ =>
                    return Left(new Exception(s"Unable to parse BOOLEAN value from the given JSON: $jsonString"))
            Right(Array(v))
        case SchemaType.INT8 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val n = primitives.Ints.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT8 value from the given JSON: $jsonString"))

            val MinValue = Byte.MinValue
            val MaxValue = Byte.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT8 value should be in range from $MinValue to $MaxValue. Given: $n"))

            // https://www.simonv.fr/TypesConvert/?integers
            Right(Array(primitives.SignedBytes.checkedCast(n.toLong)))
        case SchemaType.INT16 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val n = primitives.Ints.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT16 value from the given the JSON: $jsonString"))

            val MinValue = Short.MinValue
            val MaxValue = Short.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT16 value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(primitives.Shorts.toByteArray(n.toShort))
        case SchemaType.INT32 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val n = primitives.Ints.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT32 value from the given the JSON: $jsonString"))

            val MinValue = Int.MinValue
            val MaxValue = Int.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT32 value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(primitives.Ints.toByteArray(n))
        case SchemaType.INT64 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val n = primitives.Longs.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT64 value from the given the JSON: $jsonString"))

            val MinValue: Long = Long.MinValue
            val MaxValue: Long = Long.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT64 value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(primitives.Longs.toByteArray(n))
        case SchemaType.FLOAT =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val n = primitives.Floats.tryParse(jsonString)

            val MinValue = Float.MinValue
            val MaxValue = Float.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"FLOAT value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(ByteBuffer.allocate(4).putFloat(n).array)
        case SchemaType.DOUBLE =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            val n = primitives.Doubles.tryParse(jsonString)

            val MinValue = Double.MinValue
            val MaxValue = Double.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"DOUBLE value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(ByteBuffer.allocate(8).putDouble(n).array)

        case _ => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))

    result
