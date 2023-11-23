package schema

import com.google.protobuf.Descriptors
import com.google.protobuf.ByteString
import com.google.protobuf.DescriptorProtos.{FileDescriptorProto, FileDescriptorSet}
import com.google.protobuf.Descriptors.FileDescriptor
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.schema.{CompileProtobufNativeRequest, CompileProtobufNativeResponse, CompiledProtobufNativeFile, CreateKeyValueSchemaRequest, CreateKeyValueSchemaResponse, CreateSchemaRequest, CreateSchemaResponse, DecodeKeyValueSchemaInfoRequest, DecodeKeyValueSchemaInfoResponse, DeleteSchemaRequest, DeleteSchemaResponse, GetHumanReadableSchemaRequest, GetHumanReadableSchemaResponse, GetLatestSchemaInfoRequest, GetLatestSchemaInfoResponse, ListSchemasRequest, ListSchemasResponse, ProtobufNativeSchema, SchemaInfoWithVersion, SchemaServiceGrpc, TestCompatibilityRequest, TestCompatibilityResponse, SchemaInfo as SchemaInfoPb, SchemaType as SchemaTypePb}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.admin.PulsarAdminException

import scala.concurrent.ExecutionContext
import org.apache.pulsar.client.impl.schema.{KeyValueSchemaInfo, ProtobufNativeSchemaUtils}

import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode}
import org.apache.pulsar.common.schema.{KeyValueEncodingType, SchemaInfo, SchemaType}
import _root_.schema.protobufnative
import org.apache.pulsar.common.protocol.schema.PostSchemaPayload
import pulsar_auth.RequestContext

import scala.concurrent.{Await, Future}
import java.util
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.Duration
import schema.protobufnative.FileEntry

import java.util.UUID

class SchemaServiceImpl extends SchemaServiceGrpc.SchemaService:
    val logger: Logger = Logger(getClass.getName)

    override def createSchema(request: CreateSchemaRequest): Future[CreateSchemaResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        request.schemaInfo match
            case Some(schemaInfoPb) =>
                logger.info(s"Creating schema with name ${schemaInfoPb.name} for topic ${request.topic}.")

                val schemaInfo = schemaInfoFromPb(schemaInfoPb)
                try
                    adminClient.schemas.createSchema(request.topic, schemaInfo)

                    logger.info(s"Successfully created schema with name ${schemaInfoPb.name} for topic ${request.topic}.")
                    val status = Status(code = Code.OK.index)
                    Future.successful(CreateSchemaResponse(status = Some(status)))
                catch
                    case err =>
                        logger.info(s"Failed to create schema with name ${schemaInfoPb.name} for topic ${request.topic}. Reason: ${err.getMessage}.")
                        val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                        Future.successful(CreateSchemaResponse(status = Some(status)))

            case _ =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                Future.successful(CreateSchemaResponse(status = Some(status)))


    override def createKeyValueSchema(request: CreateKeyValueSchemaRequest): Future[CreateKeyValueSchemaResponse] =
        logger.info(s"Encoding key/value schema.")
        val adminClient = RequestContext.pulsarAdmin.get()

        val keyValueSchemaName = request.schemaName

        val keySchemaInfo = request.keySchemaInfo match
            case Some(schemaInfoPb) => schemaInfoFromPb(schemaInfoPb)
            case None =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                return Future.successful(CreateKeyValueSchemaResponse(status = Some(status)))

        val valueSchemaInfo = request.valueSchemaInfo match
            case Some(schemaInfoPb) => schemaInfoFromPb(schemaInfoPb)
            case None =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                return Future.successful(CreateKeyValueSchemaResponse(status = Some(status)))

        val keyValueEncodingType = keyValueEncodingTypeFromPb(request.encodingType)

        val schemaInfo = KeyValueSchemaInfo.encodeKeyValueSchemaInfo(
            keyValueSchemaName,
            keySchemaInfo,
            valueSchemaInfo,
            keyValueEncodingType
        )

        try
            adminClient.schemas.createSchema(request.topic, schemaInfo)

            logger.info(s"Successfully created key value schema with name ${schemaInfo.getName} for topic ${request.topic}.")
            val status = Status(code = Code.OK.index)
            Future.successful(CreateKeyValueSchemaResponse(status = Some(status)))
        catch
            case err =>
                logger.info(s"Failed to create key value schema with name ${schemaInfo.getName} for topic ${request.topic}. Reason: ${err.getMessage}.")
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateKeyValueSchemaResponse(status = Some(status)))

    override def decodeKeyValueSchemaInfo(request: DecodeKeyValueSchemaInfoRequest): Future[DecodeKeyValueSchemaInfoResponse] =
        logger.info(s"Decoding key/value schema.")
        val adminClient = RequestContext.pulsarAdmin.get()

        val schemaInfo = request.keyValueSchemaInfo match
            case Some(schemaInfoPb) => schemaInfoFromPb(schemaInfoPb)
            case None =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                return Future.successful(DecodeKeyValueSchemaInfoResponse(status = Some(status)))

        val decodedSchemaInfo = KeyValueSchemaInfo.decodeKeyValueSchemaInfo(schemaInfo)

        val schemaName = schemaInfo.getName
        val keySchemaInfo = decodedSchemaInfo.getKey
        val valueSchemaInfo = decodedSchemaInfo.getValue
        val keyValueEncodingType = schemaInfo.getProperties.asScala.get("kv.encoding.type") match
            case Some("INLINE") => KeyValueEncodingType.INLINE
            case Some("SEPARATED") => KeyValueEncodingType.SEPARATED
            case _ => KeyValueEncodingType.INLINE

        val status = Status(code = Code.OK.index)
        Future.successful(
            DecodeKeyValueSchemaInfoResponse(
                status = Some(status),
                schemaName = schemaName,
                keySchemaInfo = Some(schemaInfoToPb(keySchemaInfo)),
                valueSchemaInfo = Some(schemaInfoToPb(valueSchemaInfo)),
                encodingType = keyValueEncodingTypeToPb(keyValueEncodingType)
            )
        )

    override def deleteSchema(request: DeleteSchemaRequest): Future[DeleteSchemaResponse] =
        logger.info(s"Deleting latest schema for topic ${request.topic}.")
        val adminClient = RequestContext.pulsarAdmin.get()


        try {
            adminClient.schemas.deleteSchema(request.topic, request.force)

            logger.info(s"Successfully deleted latest schema for topic ${request.topic}.")
            val status = Status(code = Code.OK.index)
            Future.successful(DeleteSchemaResponse(status = Some(status)))
        } catch {
            case err =>
                logger.info(s"Failed to delete latest schema for topic ${request.topic}. Reason: ${err.getMessage}.")
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteSchemaResponse(status = Some(status)))
        }

    override def getLatestSchemaInfo(request: GetLatestSchemaInfoRequest): Future[GetLatestSchemaInfoResponse] =
        logger.info(s"Getting latest schema info for topic ${request.topic}.")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val schemaInfoWithVersion = adminClient.schemas.getSchemaInfoWithVersion(request.topic)
            val status = Status(code = Code.OK.index)

            val schemaInfoWithVersionPb = SchemaInfoWithVersion(
                    schemaInfo = Some(schemaInfoToPb(schemaInfoWithVersion.getSchemaInfo)),
                    schemaVersion = schemaInfoWithVersion.getVersion
                )

            logger.info(s"Successfully got latest schema info for topic ${request.topic}.")
            Future.successful(
                GetLatestSchemaInfoResponse(
                    status = Some(status),
                    schemaInfoWithVersion = Some(schemaInfoWithVersionPb)
                )
            )
        } catch {
            case (_: PulsarAdminException.NotFoundException) =>
                logger.info(s"No schema where found for topic ${request.topic}.")
                val status = Status(code = Code.OK.index)
                Future.successful(GetLatestSchemaInfoResponse(status = Some(status), schemaInfoWithVersion = None))
            case (err: PulsarAdminException) =>
                logger.info(s"Failed to get latest schema info for topic ${request.topic}. Reason: ${err.getMessage}.")
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetLatestSchemaInfoResponse(status = Some(status)))
        }

    override def listSchemas(request: ListSchemasRequest): Future[ListSchemasResponse] =
        logger.info(s"Listing schemas for topic ${request.topic}.")
        val adminClient = RequestContext.pulsarAdmin.get()
        given ExecutionContext = ExecutionContext.global

        try {
            val schemaInfos = adminClient.schemas.getAllSchemas(request.topic).asScala.toList

            val getVersionFutures =
                if schemaInfos.nonEmpty && schemaInfos.last.getType == SchemaType.KEY_VALUE then
                    val lastSchemaVersion = adminClient.schemas.getSchemaInfoWithVersion(request.topic).getVersion

                    schemaInfos
                        .map(si =>
                            val f: Future[java.lang.Long] = if si.getType == SchemaType.KEY_VALUE then
                                if schemaInfos.last == si then
                                    Future.successful(lastSchemaVersion)
                                else
                                    // Here we are giving the versions for non-latest schemas (for correct sorting at the UI)
                                    Future.successful(
                                        lastSchemaVersion - (schemaInfos.length - 1 - schemaInfos.indexOf(si))
                                    )
                            else
                                adminClient.schemas.getVersionBySchemaAsync(request.topic, si).asScala

                            f
                        )
                else
                    schemaInfos
                        .map(si => adminClient.schemas.getVersionBySchemaAsync(request.topic, si))
                        .map(_.asScala)


            val schemaVersions = Await.result(Future.sequence(getVersionFutures), Duration(1, TimeUnit.MINUTES))

            val schemas = schemaInfos
                .zip(schemaVersions)
                .map(v => SchemaInfoWithVersion(schemaInfo = Some(schemaInfoToPb(v._1)), schemaVersion = v._2))

            logger.info(s"Successfully listed schemas for topic ${request.topic}.")
            val status = Status(code = Code.OK.index)
            Future.successful(ListSchemasResponse(status = Some(status), schemas = schemas))
        } catch {
            case err =>
                logger.info(s"Failed to list schemas for topic ${request.topic}. Reason: ${err.getMessage}.")
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ListSchemasResponse(status = Some(status)))
        }

    override def compileProtobufNative(request: CompileProtobufNativeRequest): Future[CompileProtobufNativeResponse] =
        val filesToCompile = request.files
            .filter(f => f.relativePath.endsWith(".proto"))
            .map(f => FileEntry(relativePath = f.relativePath, content = f.content))

        logger.info(s"Compiling ${filesToCompile.size} protobuf native files.")

        val files: Map[String, CompiledProtobufNativeFile] = protobufnative.compiler
            .compileFiles(files = filesToCompile)
            .files
            .map(f =>
                val (relativePath, compiledFile) = f
                val compiledFilePb = compiledFile match
                    case Right(f) =>
                        CompiledProtobufNativeFile(
                            schemas = f.schemas
                                .map(s =>
                                    val (messageName, schema) = s
                                    val schemaPb: ProtobufNativeSchema = ProtobufNativeSchema(
                                        rawSchema = ByteString.copyFrom(schema.rawSchema),
                                        humanReadableSchema = schema.humanReadableSchema
                                    )
                                    (messageName, schemaPb)
                                )
                        )
                    case Left(err) => CompiledProtobufNativeFile(compilationError = Some(err.getMessage))
                (relativePath, compiledFilePb)
            )

        logger.info(s"Compiled ${files.size} protobuf native files.")
        val status = Status(code = Code.OK.index)
        Future.successful(CompileProtobufNativeResponse(status = Some(status), files))

    override def testCompatibility(request: TestCompatibilityRequest): Future[TestCompatibilityResponse] =
        logger.info(s"Testing schema compatibility for topic ${request.topic}.")
        val adminClient = RequestContext.pulsarAdmin.get()

        val schemaInfo = request.schemaInfo match
            case Some(spb) => schemaInfoFromPb(spb)
            case None =>
                logger.info(s"Successfully tested schema compatibility for topic ${request.topic}.")
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                return Future.successful(TestCompatibilityResponse(status = Some(status)))

        val compatibilityTestResult = protobufnative.schemaCompatibility.test(
            pulsarAdmin = adminClient,
            topic = request.topic,
            schemaInfo = schemaInfo
        )

        logger.info(s"Successfully tested schema compatibility for topic ${request.topic}.")

        val status = Status(code = Code.OK.index)
        Future.successful(
            TestCompatibilityResponse(
                status = Some(status),
                isCompatible = compatibilityTestResult.isCompatible,
                strategy = compatibilityTestResult.strategy,
                incompatibleReason = compatibilityTestResult.incompatibleReason,
                incompatibleFullReason = compatibilityTestResult.incompatibleFullReason
            )
        )

    override def getHumanReadableSchema(request: GetHumanReadableSchemaRequest): Future[GetHumanReadableSchemaResponse] =
        request.schemaType match
            case SchemaTypePb.SCHEMA_TYPE_PROTOBUF_NATIVE =>
                val descriptor = ProtobufNativeSchemaUtils.deserialize(request.rawSchema.toByteArray)
                val status = Status(code = Code.OK.index)
                Future.successful(
                    GetHumanReadableSchemaResponse(
                        status = Some(status),
                        humanReadableSchema = Some(descriptor.toProto.toString)
                    )
                )
            case _ =>
                val status = Status(code = Code.OK.index)
                Future.successful(
                    GetHumanReadableSchemaResponse(
                        status = Some(status),
                        humanReadableSchema = Some(request.rawSchema.toStringUtf8)
                    )
                )
