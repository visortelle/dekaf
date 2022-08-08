package producer

import _root_.client.{adminClient, client}
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode, Schema}
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.producer.{CreateProducerRequest, CreateProducerResponse, DeleteProducerRequest, DeleteProducerResponse, GetStatsRequest, GetStatsResponse, MessageFormat, ProducerServiceGrpc, SendRequest, SendResponse, Stats}
import org.apache.pulsar.client.api.schema.SchemaInfoProvider
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import _root_.schema.avro
import com.google.protobuf.ByteString

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

        val messages = request.format match
            case MessageFormat.MESSAGE_FORMAT_JSON =>
                val schema = adminClient.schemas.getSchemaInfo(producer.getTopic).getSchema
                request.messages.map(msg =>
                    avro.fromJson(schema, msg.toByteArray) match
                        case Right(v) => ByteString.copyFrom(v)
                        case Left(err) =>
                            val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = s"Unable to send a message: $err")
                            return Future.successful(SendResponse(status = Some(status)))
                )
            case _ => request.messages


        messages.foreach(msg =>
            try {
                producer.send(msg.toByteArray)
            } catch {
                case err =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    return Future.successful(SendResponse(status = Some(status)))
            }
        )
        val status: Status = Status(code = Code.OK.index)
        Future.successful(SendResponse(status = Some(status)))



    override def getStats(request: GetStatsRequest): Future[GetStatsResponse] = ???


