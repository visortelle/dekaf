package producer

import _root_.client.{adminClient, client}
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode, Schema}
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.producer.{
    CreateProducerRequest,
    CreateProducerResponse,
    DeleteProducerRequest,
    DeleteProducerResponse,
    GetStatsRequest,
    GetStatsResponse,
    MessageFormat,
    ProducerServiceGrpc,
    SendRequest,
    SendResponse,
    Stats
}
import org.apache.pulsar.client.api.schema.SchemaInfoProvider
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import _root_.schema.avro
import com.google.protobuf
import com.google.protobuf.ByteString

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import com.google.common.primitives
import org.apache.pulsar.client.admin.PulsarAdminException
import io.circe.*
import io.circe.parser.parse as parseJson

import java.nio.charset.Charset
import java.nio.{ByteBuffer, ByteOrder}
import scala.concurrent.Future

type ProducerName = String

class ProducerServiceImpl extends ProducerServiceGrpc.ProducerService:
    val logger: Logger = Logger(getClass.getName)
    var producers: Map[ProducerName, Producer[Array[Byte]]] = Map.empty

    override def createProducer(request: CreateProducerRequest): Future[CreateProducerResponse] =
        val producerName: ProducerName = request.producerName
        logger.info(s"Creating producer: $producerName")

        try {
            val schema = new AutoProduceBytesSchema[Array[Byte]]

            val producer: Producer[Array[Byte]] = client
                .newProducer(schema)
                .accessMode(ProducerAccessMode.Shared)
                .producerName(producerName)
                .topic(request.topic)
                .create()

            producers = producers + (producerName -> producer)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateProducerResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateProducerResponse(status = Some(status)))
        }

    override def deleteProducer(request: DeleteProducerRequest): Future[DeleteProducerResponse] =
        val producerName: ProducerName = request.producerName
        logger.info(s"Deleting producer: $producerName")

        producers.get(producerName) match
            case Some(p) =>
                try {
                    producers = producers.removed(producerName)
                    p.close()

                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(DeleteProducerResponse(status = Some(status)))
                } catch {
                    case err =>
                        val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                        Future.successful(DeleteProducerResponse(status = Some(status)))
                }
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = s"No such producer: $producerName")
                Future.successful(DeleteProducerResponse(status = Some(status)))

    override def send(request: SendRequest): Future[SendResponse] =
        val producerName: ProducerName = request.producerName
        logger.info(s"Sending message. Producer: $producerName")

        val producer = producers.get(producerName) match
            case Some(p) => p
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = s"No such producer: $producerName")
                return Future.successful(SendResponse(status = Some(status)))

        val messages: Seq[Either[Throwable, Message]] = request.format match
            case MessageFormat.MESSAGE_FORMAT_JSON =>
                val schemaInfo: Option[SchemaInfo] =
                    try
                        Some(adminClient.schemas.getSchemaInfo(producer.getTopic))
                    catch {
                        case _: PulsarAdminException.NotFoundException => None
                        case err =>
                            val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                            return Future.successful(SendResponse(status = Some(status)))
                    }

                schemaInfo match
                    case None =>
                        request.messages.map(msg =>
                            val message =
                                Message(value = msg.value.toByteArray, key = msg.key, eventTime = msg.eventTime, properties = msg.properties)
                            Right(message)
                        )
                    case Some(si) =>
                        request.messages.map { msg =>
                            jsonToValue(si, msg.value.toByteArray) match
                                case Right(value) =>
                                    val message = Message(value = value, key = msg.key, eventTime = msg.eventTime, properties = msg.properties)
                                    Right(message)
                                case Left(err) => Left(err)
                        }
            case _ =>
                request.messages.map(msg =>
                    val message = Message(value = msg.value.toByteArray, key = msg.key, eventTime = msg.eventTime, properties = msg.properties)
                    Right(message)
                )

        messages.foreach(msg =>
            msg match
                case Right(message) =>
                    try {
                        var newMessage = producer.newMessage
                            .value(message.value)
                            .properties(message.properties.asJava)
                        message.eventTime match
                            case Some(t) => newMessage = newMessage.eventTime(t)
                            case None    => // do nothing
                        message.key match
                            case Some(k) => newMessage = newMessage.key(k)
                            case None    => // do nothing
                        newMessage.sendAsync
                    } catch {
                        case err =>
                            val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                            return Future.successful(SendResponse(status = Some(status)))
                    }
                case Left(err) =>
                    val status: Status = Status(code = Code.INVALID_ARGUMENT.index, message = err.getMessage)
                    return Future.successful(SendResponse(status = Some(status)))
        )

        val status: Status = Status(code = Code.OK.index)
        Future.successful(SendResponse(status = Some(status)))

    override def getStats(request: GetStatsRequest): Future[GetStatsResponse] = ???

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

    result
