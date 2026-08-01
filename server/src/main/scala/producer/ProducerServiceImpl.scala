package producer

import org.apache.pulsar.client.api.{MessageId, Producer, ProducerAccessMode, Schema}
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.producer.{CreateProducerRequest, CreateProducerResponse, DeleteProducerRequest, DeleteProducerResponse, GetStatsRequest, GetStatsResponse, MessageFormat, ProducerServiceGrpc, SendRequest, SendResponse, Stats}
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import _root_.schema.avro
import _root_.schema.protobufnative

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import com.google.common.primitives
import org.apache.pulsar.client.admin.PulsarAdminException
import io.circe.*
import io.circe.parser.parse as parseJson
import pulsar_auth.RequestContext

import java.nio.ByteBuffer
import java.util.concurrent.{CompletableFuture, ConcurrentHashMap}
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.FutureConverters.*
import scala.util.boundary, boundary.break

type ProducerName = String

class ProducerServiceImpl extends ProducerServiceGrpc.ProducerService:
    val logger: Logger = Logger(getClass.getName)

    /** Live broker producers, by the name the UI created them under.
      *
      * A ConcurrentHashMap rather than a `var Map`, because every entry is a resource: this service
      * is a singleton bound on `ExecutionContext.global` (GrpcServer), so create/delete run
      * concurrently, and `producers = producers + (name -> p)` is a read-modify-write. Two creates
      * that read the same snapshot lost one entry - that producer stayed connected to the topic
      * while its name vanished from the only map that could close it, so `deleteProducer` answered
      * "no such producer" forever. `put`/`remove` here are atomic AND hand back whatever they
      * displaced, which is what makes closing it possible at all. */
    private[producer] val producers: ConcurrentHashMap[ProducerName, Producer[Array[Byte]]] = ConcurrentHashMap()

    /** Close a producer this service is giving up. A failure here must not fail the RPC that caused
      * it - the entry is already gone from the registry either way - but it must not be silent. */
    private def closeReleased(producerName: ProducerName, producer: Producer[Array[Byte]]): Unit =
        try producer.close()
        catch case err => logger.warn(s"Failed to close producer $producerName: ${err.getMessage}")

    override def createProducer(request: CreateProducerRequest): Future[CreateProducerResponse] =
        val producerName: ProducerName = request.producerName
        logger.info(s"Creating producer: $producerName")
        val pulsarClient = RequestContext.pulsarClient.get()

        try {
            val schema = new AutoProduceBytesSchema[Array[Byte]]

            val producer: Producer[Array[Byte]] = pulsarClient
                .newProducer(schema)
                .accessMode(ProducerAccessMode.Shared)
                .producerName(producerName)
                .topic(request.topic)
                .create()

            // Registering under a name that is already taken (a re-create after an edit or a page
            // reload, or a concurrent create that got here second) used to overwrite the entry and
            // leak the producer it displaced. Whatever this replaces is ours to close.
            Option(producers.put(producerName, producer)).foreach(closeReleased(producerName, _))

            val status: Status = Status(code = Code.OK.value)
            Future.successful(CreateProducerResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage)
                Future.successful(CreateProducerResponse(status = Some(status)))
        }

    override def deleteProducer(request: DeleteProducerRequest): Future[DeleteProducerResponse] =
        val producerName: ProducerName = request.producerName
        logger.info(s"Deleting producer: $producerName")

        // Remove-then-close as one atomic claim: the producer this call closes is exactly the one it
        // took out of the registry, so two concurrent deletes cannot both close the same handle and
        // a create racing alongside cannot have its brand-new producer removed by the loser.
        Option(producers.remove(producerName)) match
            case Some(p) =>
                try {
                    p.close()

                    val status: Status = Status(code = Code.OK.value)
                    Future.successful(DeleteProducerResponse(status = Some(status)))
                } catch {
                    case err =>
                        val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage)
                        Future.successful(DeleteProducerResponse(status = Some(status)))
                }
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = s"No such producer: $producerName")
                Future.successful(DeleteProducerResponse(status = Some(status)))

    override def send(request: SendRequest): Future[SendResponse] = boundary:
        val producerName: ProducerName = request.producerName
        logger.info(s"Sending message. Producer: $producerName")
        val adminClient = RequestContext.pulsarAdmin.get()

        val producer = Option(producers.get(producerName)) match
            case Some(p) => p
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = s"No such producer: $producerName")
                break(Future.successful(SendResponse(status = Some(status))))

        val messages: Seq[Either[Throwable, Message]] = request.format match
            case MessageFormat.MESSAGE_FORMAT_JSON =>
                val schemaInfo: Option[SchemaInfo] =
                    try
                        Some(adminClient.schemas.getSchemaInfo(producer.getTopic))
                    catch {
                        case _: PulsarAdminException.NotFoundException => None
                        case err =>
                            val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage)
                            break(Future.successful(SendResponse(status = Some(status))))
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

        // Validate the WHOLE batch before publishing any of it. Validation used to be INTERLEAVED
        // with `sendAsync` - each item was checked immediately before its own send - so a valid item
        // preceding an invalid one was already on the topic when the call answered INVALID_ARGUMENT.
        // The caller sees a wholly failed batch, retries it, and duplicates whatever did land.
        messages.collectFirst { case Left(err) => err } match
            case Some(err) =>
                val status: Status = Status(code = Code.INVALID_ARGUMENT.value, message = err.getMessage)
                break(Future.successful(SendResponse(status = Some(status))))
            case None => // the whole batch converted; publishing it is safe

        // Publication is NOT atomic and cannot be made so after the fact: the items are submitted one
        // at a time, and a send already handed to the client cannot be recalled. A builder/`sendAsync`
        // that throws on item N (producer closed, payload over the max message size) used to break
        // straight out of `send` with FAILED_PRECONDITION, ABANDONING the futures of items 1..N-1 -
        // so the RPC reported failure while part of its own batch was still travelling to the topic,
        // and the caller's retry duplicated whatever landed. Stop submitting at the first failure,
        // but keep every future that was submitted and let `awaitSends` settle all of them before the
        // verdict exists. A partial publish therefore remains possible; what is guaranteed is that
        // the batch is finished travelling by the time its verdict is delivered.
        val sendFutures = scala.collection.mutable.ArrayBuffer.empty[CompletableFuture[MessageId]]
        var submitFailure: Option[Throwable] = None

        val toPublish = messages.collect { case Right(message) => message }.iterator
        while toPublish.hasNext && submitFailure.isEmpty do
            val message = toPublish.next()
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
                sendFutures += newMessage.sendAsync
            } catch {
                case err => submitFailure = Some(err)
            }

        awaitSends(sendFutures.toSeq, submitFailure)

    override def getStats(request: GetStatsRequest): Future[GetStatsResponse] = ???

/** Build the send response from the in-flight `sendAsync` futures, plus the failure (if any) that
  * stopped `send` from submitting the rest of the batch.
  *
  * A Pulsar send future completes only when the BROKER has acknowledged (or rejected) the message,
  * so answering before then is a guess: `send` used to discard every future and return Code.OK
  * immediately, which reported a successful publish for messages the broker went on to reject
  * (schema incompatibility, producer fenced, exceeded quota, terminated topic, send timeout).
  *
  * Every submitted future must SETTLE before the verdict exists. `Future.sequence` is fail-fast, so
  * one rejection completed the RPC as failed while its siblings were still in flight; those siblings
  * then landed on the topic AFTER the caller had been told the batch failed, and the natural retry
  * duplicated them. Each future is therefore lifted to a `Try` (which never fails) and only the
  * collected results decide the answer. The semantics are still non-atomic - a partial publish is
  * possible and a retry can duplicate what landed - but the batch is no longer in motion when its
  * verdict is delivered.
  *
  * Composed rather than blocked on, so the gRPC thread is not parked while the broker decides;
  * `parasitic` runs the continuation on whichever thread completes the last future.
  */
def awaitSends(sendFutures: Seq[CompletableFuture[MessageId]], submitFailure: Option[Throwable] = None): Future[SendResponse] =
    given ExecutionContext = ExecutionContext.parasitic

    val settled: Seq[Future[scala.util.Try[MessageId]]] =
        sendFutures.map(_.asScala.transform(scala.util.Success(_)))

    Future.sequence(settled).map { results =>
        // The submit failure wins when there is one: it is the reason the batch is incomplete, and
        // it says more than a sibling's broker error would.
        submitFailure.orElse(results.collectFirst { case scala.util.Failure(err) => err }) match
            case None => SendResponse(status = Some(Status(code = Code.OK.value)))
            case Some(err) =>
                val message = Option(err.getMessage).getOrElse(err.toString)
                SendResponse(status = Some(Status(code = Code.FAILED_PRECONDITION.value, message = s"Failed to send message. $message")))
    }

case class Message(
    key: Option[String],
    value: Array[Byte],
    eventTime: Option[Long],
    properties: Map[String, String]
)

/** True only for a payload that is a single, well-formed JSON number. */
def isJsonNumber(payload: String): Boolean =
    parseJson(payload).exists(_.isNumber)

def jsonToValue(schemaInfo: SchemaInfo, jsonAsBytes: Array[Byte]): Either[Throwable, Array[Byte]] =
    val result: Either[Throwable, Array[Byte]] = schemaInfo.getType match
        case SchemaType.AVRO =>
            avro.converters.fromJson(schemaInfo.getSchema, jsonAsBytes) match
                case Right(v)  => Right(v)
                case Left(err) => Left(err)
        case SchemaType.PROTOBUF_NATIVE =>
            protobufnative.converters.fromJson(schemaInfo.getSchema, jsonAsBytes) match
                case Right(v) => Right(v)
                case Left(err) => Left(err)
        case SchemaType.JSON =>
            // The topic's schema says JSON, so the payload has to BE JSON. Returning the bytes
            // unparsed published anything at all - the producer reported success and the consumer
            // side then failed to deserialize what had already landed on the topic. Syntax only:
            // the payload is not validated against the schema definition (that would need a JSON
            // Schema validator), and the bytes are forwarded unchanged rather than re-serialized.
            parseJson(String(jsonAsBytes, "UTF-8")) match
                case Right(_)  => Right(jsonAsBytes)
                case Left(err) => Left(new Exception(s"Message should be formatted as JSON. ${err.getMessage}"))
        case SchemaType.STRING =>
            parseJson(String(jsonAsBytes, "UTF-8")) match
                case Left(err) => Left(err)
                case Right(json) if json.isString =>
                    val str = json.asString.getOrElse("")
                    // Explicit UTF-8: the read path (primitiveConv.bytesToString) decodes as UTF-8,
                    // so relying on the platform default here would diverge under -Dfile.encoding.
                    Right(str.getBytes(java.nio.charset.StandardCharsets.UTF_8))
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
            // Guava's parser accepts JAVA integer literal syntax, not JSON: a leading zero (`01`,
            // `00`, `-01`) parsed and was encoded onto the topic even though JSON forbids it. Same
            // gate the FLOAT/DOUBLE branches below already apply, for the same reason - this is the
            // JSON message format.
            if !isJsonNumber(jsonString) then return Left(new Exception(s"Unable to parse INT8 value from the given JSON: $jsonString"))

            val n = primitives.Ints.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT8 value from the given JSON: $jsonString"))

            val MinValue = Byte.MinValue
            val MaxValue = Byte.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT8 value should be in range from $MinValue to $MaxValue. Given: $n"))

            // https://www.simonv.fr/TypesConvert/?integers
            Right(Array(primitives.SignedBytes.checkedCast(n.toLong)))
        case SchemaType.INT16 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            // See the INT8 branch: Guava accepts leading zeros, JSON does not.
            if !isJsonNumber(jsonString) then return Left(new Exception(s"Unable to parse INT16 value from the given the JSON: $jsonString"))

            val n = primitives.Ints.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT16 value from the given the JSON: $jsonString"))

            val MinValue = Short.MinValue
            val MaxValue = Short.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT16 value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(primitives.Shorts.toByteArray(n.toShort))
        case SchemaType.INT32 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            // See the INT8 branch: Guava accepts leading zeros, JSON does not.
            if !isJsonNumber(jsonString) then return Left(new Exception(s"Unable to parse INT32 value from the given the JSON: $jsonString"))

            val n = primitives.Ints.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT32 value from the given the JSON: $jsonString"))

            val MinValue = Int.MinValue
            val MaxValue = Int.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT32 value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(primitives.Ints.toByteArray(n))
        case SchemaType.INT64 =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            // See the INT8 branch: Guava accepts leading zeros, JSON does not.
            if !isJsonNumber(jsonString) then return Left(new Exception(s"Unable to parse INT64 value from the given the JSON: $jsonString"))

            val n = primitives.Longs.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse INT64 value from the given the JSON: $jsonString"))

            val MinValue: Long = Long.MinValue
            val MaxValue: Long = Long.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"INT64 value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(primitives.Longs.toByteArray(n))
        case SchemaType.FLOAT =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            // Guava's parser accepts JAVA float literal syntax, not JSON: `+1`, `01`, `.5`, `1.`,
            // hex float literals and a trailing f/d suffix all parsed and were encoded onto the
            // topic. Gate on JSON number syntax first (the STRING branch below has always required
            // real JSON), then let Guava do the numeric conversion.
            if !isJsonNumber(jsonString) then return Left(new Exception(s"Unable to parse FLOAT value from the given JSON: $jsonString"))

            val n = primitives.Floats.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse FLOAT value from the given JSON: $jsonString"))

            // NaN compares false against BOTH bounds, so it slipped through the very guard that
            // rejects Infinity and got encoded onto the topic (and NaN is not valid JSON either).
            if n.isNaN then return Left(new Exception(s"FLOAT value must be a number. Given: $jsonString"))

            val MinValue = Float.MinValue
            val MaxValue = Float.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"FLOAT value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(ByteBuffer.allocate(4).putFloat(n).array)
        case SchemaType.DOUBLE =>
            val jsonString = String(jsonAsBytes, "UTF-8")
            // See the FLOAT branch: same Guava parser, same non-JSON literal forms.
            if !isJsonNumber(jsonString) then return Left(new Exception(s"Unable to parse DOUBLE value from the given JSON: $jsonString"))

            val n = primitives.Doubles.tryParse(jsonString)
            if n == null then return Left(new Exception(s"Unable to parse DOUBLE value from the given JSON: $jsonString"))

            // See the FLOAT branch: NaN evades both bounds checks.
            if n.isNaN then return Left(new Exception(s"DOUBLE value must be a number. Given: $jsonString"))

            val MinValue = Double.MinValue
            val MaxValue = Double.MaxValue
            if n > MaxValue || n < MinValue then return Left(new Exception(s"DOUBLE value should be in range from $MinValue to $MaxValue. Given: $n"))

            Right(ByteBuffer.allocate(8).putDouble(n).array)

        case _ => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))

    result
