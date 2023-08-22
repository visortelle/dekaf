package consumer

import _root_.pulsar_auth.RequestContext
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.consumer.SeekRequest.Seek
import com.tools.teal.pulsar.ui.api.v1.consumer.{CollectionInfo, ConsumerServiceGrpc, CreateConsumerRequest, CreateConsumerResponse, DeleteConsumerRequest, DeleteConsumerResponse, DeleteMessageFilterCollectionRequest, DeleteMessageFilterCollectionResponse, DeleteMessageFilterRequest, DeleteMessageFilterResponse, GetFiltersCollectionsInfoRequest, GetFiltersCollectionsInfoResponse, GetFiltersCollectionsRequest, GetFiltersCollectionsResponse, PauseRequest, PauseResponse, ResumeRequest, ResumeResponse, RunCodeRequest, RunCodeResponse, SaveRawFiltersCollectionRequest, SaveRawFiltersCollectionResponse, SaveToExistingFiltersCollectionRequest, SaveToExistingFiltersCollectionResponse, SeekRequest, SeekResponse, SkipMessagesRequest, SkipMessagesResponse, TopicsSelector, UpdateExistingFilterCollectionRequest, UpdateExistingFilterCollectionResponse}
import com.typesafe.scalalogging.Logger
import consumer.MessageFiltersCollection.*
import io.circe.parser.decode
import io.circe.syntax.EncoderOps
import io.grpc.stub.StreamObserver
import org.apache.pulsar.client.api.{Consumer, Message, MessageId}

import java.io.{ByteArrayOutputStream, File, PrintWriter}
import java.nio.file.{Files, Paths}
import java.time.Instant
import java.util.UUID
import scala.concurrent.Future
import scala.io.Source
import scala.jdk.CollectionConverters.*

type ConsumerName = String

class StreamDataHandler:
    var onNext: Message[Array[Byte]] => Unit =
        message => ()

class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    val logger: Logger = Logger(getClass.getName)

    var topics: Map[ConsumerName, Vector[String]] = Map.empty
    var schemasByTopic: SchemasByTopic = Map.empty
    private var messageFilters: Map[ConsumerName, MessageFilter] = Map.empty
    private var consumers: Map[ConsumerName, Consumer[Array[Byte]]] = Map.empty
    private var streamDataHandlers: Map[ConsumerName, StreamDataHandler] = Map.empty
    private var processedMessagesCount: Map[ConsumerName, Long] = Map.empty
    private var responseObservers: Map[ConsumerName, StreamObserver[ResumeResponse]] = Map.empty

    override def resume(request: ResumeRequest, responseObserver: StreamObserver[ResumeResponse]): Unit =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Resume consuming. Consumer: $consumerName")

        responseObservers = responseObservers + (consumerName -> responseObserver)

        val consumer = consumers.get(consumerName) match
            case Some(consumer) => consumer
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        val streamDataHandler = streamDataHandlers.get(consumerName)
        val messageFilter = messageFilters.get(consumerName) match
            case Some(f) => f
            case _ =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"Message filter context isn't found for consumer: $consumerName"
                )
                return Future.successful(PauseResponse(status = Some(status)))

        streamDataHandler match
            case Some(handler) =>
                handler.onNext = (msg: Message[Array[Byte]]) =>
                    logger.debug(s"Message received. Consumer: $consumerName, Message id: ${msg.getMessageId}")

                    processedMessagesCount = processedMessagesCount + (consumerName -> (processedMessagesCount.getOrElse(consumerName, 0: Long) + 1))
                    val (messagePb, jsonMessage, messageValueToJsonResult) = converters.serializeMessage(schemasByTopic, msg)

                    val (filterResult, jsonAccumulator) =
                        MessageFilter.getFilterChainTestResult(request.messageFilterChain, messageFilter, jsonMessage, messageValueToJsonResult)

                    val messageToSend = messagePb
                        .withAccumulator(jsonAccumulator)
                        .withDebugStdout(messageFilter.getStdout)

                    val messages = filterResult match
                        case Right(true) => Seq(messageToSend)
                        case _           => Seq()

                    consumers.get(consumerName) match
                        case Some(_) =>
                            val status: Status = filterResult match
                                case Right(_)  => Status(code = Code.OK.index)
                                case Left(err) => Status(code = Code.INVALID_ARGUMENT.index, message = err)
                            val resumeResponse = ResumeResponse(
                                status = Some(status),
                                messages = messages,
                                processedMessages = processedMessagesCount.getOrElse(consumerName, 0: Long)
                            )
                            responseObserver.onNext(resumeResponse)
                        case _ => ()

                consumer.resume()
                val status: Status = Status(code = Code.OK.index)
                Future.successful(ResumeResponse(status = Some(status)))
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                Future.successful(ResumeResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Pausing consumer. Consumer: $consumerName")

        val consumer = consumers.get(consumerName) match
            case Some(consumer) => consumer
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        consumer.pause()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        val consumerName: ConsumerName = request.consumerName.getOrElse("__pulsocat" + UUID.randomUUID().toString)
        logger.info(s"Creating consumer. Consumer: $consumerName")
        val adminClient = RequestContext.pulsarAdmin.get()
        val pulsarClient = RequestContext.pulsarClient.get()

        val streamDataHandler = StreamDataHandler()
        streamDataHandler.onNext = _ => ()
        streamDataHandlers = streamDataHandlers + (consumerName -> streamDataHandler)
        processedMessagesCount = processedMessagesCount + (consumerName -> 0)

        messageFilters = messageFilters + (consumerName -> MessageFilter(
            MessageFilterConfig(stdout = new ByteArrayOutputStream())
        ))

        val topicsToConsume = request.topicsSelector match
            case Some(ts) =>
                ts.topicsSelector.byNames match
                    case Some(bn) => bn.topics.toVector
            case _ =>
                val status: Status =
                    Status(code = Code.INVALID_ARGUMENT.index, message = "Topic selectors other than byNames are not implemented.")
                return Future.successful(CreateConsumerResponse(status = Some(status)))

        getSchemasByTopic(adminClient, topicsToConsume)
            .foreach((topicName, schemasByVersion) => schemasByTopic = schemasByTopic + (topicName -> schemasByVersion))

        topics = topics + (consumerName -> topicsToConsume)

        val consumerBuilder = buildConsumer(pulsarClient, consumerName, request, logger, streamDataHandler) match
            case Right(consumer) => consumer
            case Left(error) =>
                logger.warn(error)
                val status: Status = Status(code = Code.INVALID_ARGUMENT.index, message = error)
                return Future.successful(CreateConsumerResponse(status = Some(status)))

        val consumer = consumerBuilder.subscribe
        consumers = consumers + (consumerName -> consumer)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(CreateConsumerResponse(status = Some(status)))

    override def deleteConsumer(request: DeleteConsumerRequest): Future[DeleteConsumerResponse] =
        val consumerName = request.consumerName
        logger.info(s"Deleting consumer. Consumer: $consumerName")

        def tryUnsubscribe(): Unit =
            consumers.get(consumerName) match
                case Some(consumer) =>
                    try
                        consumer.unsubscribe()
                    catch
                        // Unsubscribe fails on partitioned topics in most cases.
                        // Anyway we can't handle it meaningfully.
                        case _ => ()
                    finally ()
                case _ => ()

        tryUnsubscribe()

        consumers = consumers.removed(consumerName)
        streamDataHandlers = streamDataHandlers.removed(consumerName)
        processedMessagesCount = processedMessagesCount.removed(consumerName)
        responseObservers = responseObservers.removed(consumerName)
        messageFilters = messageFilters.removed(consumerName)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(DeleteConsumerResponse(status = Some(status)))

    override def seek(request: SeekRequest): Future[SeekResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Seek over subscription. Consumer: $consumerName")

        val consumer = consumers.get(consumerName) match
            case Some(v) => v
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(SeekResponse(status = Some(status)))

        request.seek match
            case Seek.Empty => Left("Seek request should contain timestamp or message id")
            case Seek.Timestamp(v) =>
                logger.info(s"Seek by timestamp. Consumer ${request.consumerName}. Timestamp: ${v.toString}")
                consumer.seek(Instant.ofEpochSecond(v.seconds, v.nanos).toEpochMilli)
                Right(())
            case Seek.MessageId(v) =>
                logger.info(s"Seek by message id. Consumer ${request.consumerName}. Message id: ${v.toString}")
                try {
                    val messageId = MessageId.fromByteArray(v.toByteArray)
                    consumer.seek(messageId)
                    Right(())
                } catch {
                    case _ =>
                        val status: Status = Status(code = Code.INVALID_ARGUMENT.index)
                        return Future.successful(SeekResponse(status = Some(status)))
                }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(SeekResponse(status = Some(status)))

    override def skipMessages(request: SkipMessagesRequest): Future[SkipMessagesResponse] =
        val status: Status = Status(code = Code.OK.index)
        Future.successful(SkipMessagesResponse(status = Some(status)))

    override def runCode(request: RunCodeRequest): Future[RunCodeResponse] =
        val messageFilter = messageFilters.get(request.consumerName) match
            case Some(f) => f
            case _ =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"Message filter context isn't found for consumer: ${request.consumerName}"
                )
                return Future.successful(RunCodeResponse(status = Some(status)))

        val result = messageFilter.runCode(request.code)

        val status: Status = Status(code = Code.OK.index)
        val response = RunCodeResponse(status = Some(status), result = Some(result))
        Future.successful(response)

    override def saveRawFiltersCollection(request: SaveRawFiltersCollectionRequest): Future[SaveRawFiltersCollectionResponse] =
        request.rawCollection match
            case Some(rawCollection) =>
                val resourceName = s"library/message-filters/${rawCollection.collectionId}.json"
                val pathToCollectionFile = Paths.get(resourceName)

                if(!Files.exists(pathToCollectionFile)) then
                    val writer = new PrintWriter(pathToCollectionFile.toFile)
                    try
                        val collection = MessageFiltersCollection(
                            id = rawCollection.collectionId,
                            name = rawCollection.collectionName,
                            filtersMap = rawCollection.filtersMap.map {
                                case (id, filter) =>
                                    id -> converters.convertToEditorFilter(filter)
                            }
                        )
                        val collectionJson = collection.asJson.toString

                        writer.write(collectionJson)

                        val status: Status = Status(code = Code.OK.index)
                        val response = SaveRawFiltersCollectionResponse(status = Some(status))

                        Future.successful(response)
                    catch
                        case err: Exception => {
                            val status: Status = Status(
                                code = Code.FAILED_PRECONDITION.index,
                                message = s"Failed to save filters to file: ${rawCollection.collectionName}. Error: ${err.getMessage}"
                            )
                            val response = SaveRawFiltersCollectionResponse(status = Some(status))
                            Future.successful(response)
                        }
                    finally
                        writer.close()
                else
                    val status: Status = Status(
                        code = Code.FAILED_PRECONDITION.index,
                        message = s"Message filter collection already exists: ${rawCollection.collectionName}"
                    )
                    val response = SaveRawFiltersCollectionResponse(status = Some(status))
                    Future.successful(response)
            case None =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"Raw collection is empty."
                )
                val response = SaveRawFiltersCollectionResponse(status = Some(status))
                Future.successful(response)


    override def saveToExistingFiltersCollection(request: SaveToExistingFiltersCollectionRequest): Future[SaveToExistingFiltersCollectionResponse] =
        val resourceName = s"library/message-filters/${request.collectionId}.json"
        val pathToCollectionFile = Paths.get(resourceName)

        if (Files.exists(pathToCollectionFile)) then
            val collectionJson = readTextFromFile(pathToCollectionFile.toFile)

            decode[MessageFiltersCollection](collectionJson) match
                case Left(err) =>
                    val status: Status = Status(
                        code = Code.FAILED_PRECONDITION.index,
                        message = s"Failed to parse message filters collection. Error: ${err.getMessage}"
                    )
                    val response = SaveToExistingFiltersCollectionResponse(status = Some(status))
                    Future.successful(response)
                case Right(collection) =>
                    val newFilters = request.filtersMap.map {
                        case (id, filter) =>
                            id -> converters.convertToEditorFilter(filter)
                    }

                    val updatedCollection: MessageFiltersCollection =
                        collection.copy(filtersMap = collection.filtersMap ++ newFilters)
                    val updatedCollectionJson = updatedCollection.asJson.toString

                    val writer = new PrintWriter(pathToCollectionFile.toFile)
                    try
                        writer.write(updatedCollectionJson)
                        val status: Status = Status(code = Code.OK.index)
                        val response = SaveToExistingFiltersCollectionResponse(status = Some(status))
                        Future.successful(response)
                    catch
                        case err: Exception => {
                            val status: Status = Status(
                                code = Code.FAILED_PRECONDITION.index,
                                message = s"Failed to save filters to file: ${collection.name}. Error: ${err.getMessage}"
                            )
                            val response = SaveToExistingFiltersCollectionResponse(status = Some(status))
                            Future.successful(response)
                        }
                    finally
                        writer.close()

        else
            val status: Status = Status(
                code = Code.FAILED_PRECONDITION.index,
                message = s"Selected collection does not exist."
            )
            val response = SaveToExistingFiltersCollectionResponse(status = Some(status))
            Future.successful(response)

    override def getFiltersCollections(request: GetFiltersCollectionsRequest): Future[GetFiltersCollectionsResponse] =
        val resourceDirectoryName = "library/message-filters"
        val directoryPath = Paths.get(resourceDirectoryName)

        val collections = Files
            .list(directoryPath)
            .iterator()
            .asScala
            .filter(Files.isRegularFile(_))
            .map { path =>
                val collectionJson = readTextFromFile(path.toFile)

                decode[MessageFiltersCollection](collectionJson) match
                    case Left(err) =>
                        logger.warn(s"Unable to parse collection file: ${path.toFile.getName}")

                        None
                    case Right(collection) =>
                        Some(collection)
            }
            .toSeq
            .flatten

        val status: Status = Status(code = Code.OK.index)
        val response = GetFiltersCollectionsResponse(
            status = Some(status),
            filtersCollections = collections.map(converters.convertToFiltersCollection)
        )
        Future.successful(response)

    override def getFiltersCollectionsInfo(request: GetFiltersCollectionsInfoRequest): Future[GetFiltersCollectionsInfoResponse] =
        val resourceDirectoryName = "library/message-filters"
        val directoryPath = Paths.get(resourceDirectoryName)

        val collectionsInfo = Files
            .list(directoryPath)
            .iterator()
            .asScala
            .filter(Files.isRegularFile(_))
            .flatMap { path =>
                val collectionJson = readTextFromFile(path.toFile)

                decode[MessageFiltersCollection](collectionJson) match
                    case Left(err) =>
                        logger.warn(s"Unable to parse collection file: ${path.toFile.getName}")

                        None
                    case Right(collection) =>
                        val collectionInfo = CollectionInfo(
                            collectionId = collection.id,
                            collectionName = collection.name,
                        )
                        Some(CollectionInfo(
                            collectionId = collection.id,
                            collectionName = collection.name,
                        ))
            }
            .toSeq

        val status: Status = Status(code = Code.OK.index)
        val response = GetFiltersCollectionsInfoResponse(
            status = Some(status),
            collectionsInfo = collectionsInfo
        )
        Future.successful(response)


    override def deleteMessageFilter(request: DeleteMessageFilterRequest): Future[DeleteMessageFilterResponse] =
        val resourceName = s"library/message-filters/${request.collectionId}.json"
        val pathToCollectionFile = Paths.get(resourceName)

        if (Files.exists(pathToCollectionFile)) then
            try
                val collectionJson = readTextFromFile(pathToCollectionFile.toFile)

                decode[MessageFiltersCollection](collectionJson) match
                    case Left(err) =>
                        logger.warn(s"Unable to parse collection file: ${pathToCollectionFile.toFile.getName}")

                        val status: Status = Status(
                            code = Code.FAILED_PRECONDITION.index,
                            message = "Unable to parse collection file"
                        )
                        val response = DeleteMessageFilterResponse(
                            status = Some(status)
                        )
                        Future.successful(response)
                    case Right(collection) =>
                        val newFilters = collection.filtersMap.removed(request.filterId)

                        val updatedCollection: MessageFiltersCollection =
                            collection.copy(filtersMap = newFilters)
                        val updatedCollectionJson = updatedCollection.asJson.toString

                        val writer = new PrintWriter(pathToCollectionFile.toFile)
                        try
                            writer.write(updatedCollectionJson)
                            val status: Status = Status(code = Code.OK.index)
                            val response = DeleteMessageFilterResponse(status = Some(status))
                            Future.successful(response)
                        catch
                            case err: Exception =>
                                val status: Status = Status(
                                    code = Code.FAILED_PRECONDITION.index,
                                    message = s"Failed to save filters to file while deleting: ${collection.name} . Error: ${err.getMessage}"
                                )
                                val response = DeleteMessageFilterResponse(status = Some(status))
                                Future.successful(response)
                        finally
                            writer.close()
            catch
                case err: Exception =>
                    val status: Status = Status(
                        code = Code.FAILED_PRECONDITION.index,
                        message = s"Failed to delete message filter collection. Error: ${err.getMessage}"
                    )
                    val response = DeleteMessageFilterResponse(status = Some(status))
                    Future.successful(response)
        else
            val status: Status = Status(
                code = Code.FAILED_PRECONDITION.index,
                message = s"Selected collection does not exist."
            )
            val response = DeleteMessageFilterResponse(status = Some(status))
            Future.successful(response)


    override def deleteMessageFilterCollection(request: DeleteMessageFilterCollectionRequest): Future[DeleteMessageFilterCollectionResponse] = 
        val resourceName = s"library/message-filters/${request.collectionId}.json"
        val pathToCollectionFile = Paths.get(resourceName)

        if (Files.exists(pathToCollectionFile)) then
            try
                Files.delete(pathToCollectionFile)
                val status: Status = Status(code = Code.OK.index)
                val response = DeleteMessageFilterCollectionResponse(status = Some(status))
                Future.successful(response)
            catch
                case err: Exception =>
                    val status: Status = Status(
                        code = Code.FAILED_PRECONDITION.index,
                        message = s"Failed to delete message filter collection. Error: ${err.getMessage}"
                    )
                    val response = DeleteMessageFilterCollectionResponse(status = Some(status))
                    Future.successful(response)
        else
            val status: Status = Status(
                code = Code.FAILED_PRECONDITION.index,
                message = s"Selected collection does not exist."
            )
            val response = DeleteMessageFilterCollectionResponse(status = Some(status))
            Future.successful(response)


    override def updateExistingFilterCollection(request: UpdateExistingFilterCollectionRequest): Future[UpdateExistingFilterCollectionResponse] =
        request.rawCollection match
            case Some(rawCollection) =>
                val resourceName = s"library/message-filters/${rawCollection.collectionId}.json"
                val pathToCollectionFile = Paths.get(resourceName)

                if (Files.exists(pathToCollectionFile)) then
                    val collectionJson = readTextFromFile(pathToCollectionFile.toFile)

                    decode[MessageFiltersCollection](collectionJson) match
                        case Left(err) =>
                            val status: Status = Status(
                                code = Code.FAILED_PRECONDITION.index,
                                message = s"Failed to parse message filters collection. Error: ${err.getMessage}"
                            )
                            val response = UpdateExistingFilterCollectionResponse(status = Some(status))
                            Future.successful(response)
                        case Right(collection) =>
                            val newFilters = rawCollection.filtersMap.map {
                                case (id, filter) =>
                                    id -> converters.convertToEditorFilter(filter)
                            }

                            val updatedCollection: MessageFiltersCollection =
                                collection.copy(
                                    id = rawCollection.collectionId,
                                    name = rawCollection.collectionName,
                                    filtersMap = collection.filtersMap ++ newFilters
                                )
                            val updatedCollectionJson = updatedCollection.asJson.toString

                            val writer = new PrintWriter(pathToCollectionFile.toFile)
                            try
                                writer.write(updatedCollectionJson)
                                val status: Status = Status(code = Code.OK.index)
                                val response = UpdateExistingFilterCollectionResponse(status = Some(status))
                                Future.successful(response)
                            catch
                                case err: Exception => {
                                    val status: Status = Status(
                                        code = Code.FAILED_PRECONDITION.index,
                                        message = s"Failed to save filters to file: ${collection.name}. Error: ${err.getMessage}"
                                    )
                                    val response = UpdateExistingFilterCollectionResponse(status = Some(status))
                                    Future.successful(response)
                                }
                            finally
                                writer.close()

                else
                    val status: Status = Status(
                        code = Code.FAILED_PRECONDITION.index,
                        message = s"Selected collection does not exist."
                    )
                    val response = UpdateExistingFilterCollectionResponse(status = Some(status))
                    Future.successful(response)
            case None =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"Raw collection is empty."
                )
                val response = UpdateExistingFilterCollectionResponse(status = Some(status))
                Future.successful(response)

    private def readTextFromFile(file: File): String =
        val reader = Source.fromFile(file)
        val contents = reader.mkString
        reader.close()

        contents
