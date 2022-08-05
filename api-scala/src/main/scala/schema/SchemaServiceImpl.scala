package schema

import _root_.client.{adminClient, client}
import com.google.protobuf.Descriptors
import com.google.protobuf.ByteString
import com.google.protobuf.DescriptorProtos.{FileDescriptorProto, FileDescriptorSet}
import com.google.protobuf.Descriptors.FileDescriptor
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.schema.{
    CompiledProtobufNativeFile,
    CompileProtobufNativeRequest,
    CompileProtobufNativeResponse,
    CreateSchemaRequest,
    CreateSchemaResponse,
    DeleteSchemaRequest,
    DeleteSchemaResponse,
    GetHumanReadableSchemaRequest,
    GetHumanReadableSchemaResponse,
    GetLatestSchemaInfoRequest,
    GetLatestSchemaInfoResponse,
    ListSchemasRequest,
    ListSchemasResponse,
    ProtobufNativeSchema,
    SchemaInfo as SchemaInfoPb,
    SchemaInfoWithVersion,
    SchemaServiceGrpc,
    SchemaType as SchemaTypePb,
    TestCompatibilityRequest,
    TestCompatibilityResponse
}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.admin.PulsarAdminException

import scala.concurrent.ExecutionContext
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils

import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import _root_.schema.protobufnative

import scala.concurrent.{Await, Future}
import java.util
import java.util.concurrent.CompletableFuture
import scala.concurrent.duration.Duration
import schema.protobufnative.FileEntry

class SchemaServiceImpl extends SchemaServiceGrpc.SchemaService:
    val logger: Logger = Logger(getClass.getName)

    override def createSchema(request: CreateSchemaRequest): Future[CreateSchemaResponse] =
        request.schemaInfo match
            case Some(s) =>
                logger.info(s"Creating schema with name ${s.name} for topic ${request.topic}.")

                val schemaInfo = SchemaInfo.builder
                    .name(s.name)
                    .`type`(schemaTypeFromPb(s.`type`))
                    .properties(s.properties.asJava)
                    .schema(s.schema.toByteArray)
                    .build()

                try {
                    adminClient.schemas.createSchema(request.topic, schemaInfo)

                    logger.info(s"Successfully created schema with name ${s.name} for topic ${request.topic}.")
                    val status = Status(code = Code.OK.index)
                    Future.successful(CreateSchemaResponse(status = Some(status)))
                } catch {
                    case err =>
                        logger.info(s"Failed to create schema with name ${s.name} for topic ${request.topic}. Reason: ${err.getMessage}.")
                        val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                        Future.successful(CreateSchemaResponse(status = Some(status)))
                }

            case _ =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                Future.successful(CreateSchemaResponse(status = Some(status)))

    override def deleteSchema(request: DeleteSchemaRequest): Future[DeleteSchemaResponse] =
        logger.info(s"Deleting latest schema for topic ${request.topic}.")

        try {
            adminClient.schemas.deleteSchema(request.topic)

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

        try {
            val schemaInfoWithVersion = adminClient.schemas.getSchemaInfoWithVersion(request.topic)
            val status = Status(code = Code.OK.index)

            logger.info(s"Successfully got latest schema info for topic ${request.topic}.")
            Future.successful(
              GetLatestSchemaInfoResponse(
                status = Some(status),
                schemaInfo = Some(schemaInfoToPb(schemaInfoWithVersion.getSchemaInfo)),
                schemaVersion = Option(schemaInfoWithVersion.getVersion)
              )
            )
        } catch {
            case (_: PulsarAdminException.NotFoundException) =>
                logger.info(s"No schema where found for topic ${request.topic}.")
                val status = Status(code = Code.OK.index)
                Future.successful(GetLatestSchemaInfoResponse(status = Some(status), schemaInfo = None, schemaVersion = None))
            case (err: PulsarAdminException) =>
                logger.info(s"Failed to get latest schema info for topic ${request.topic}. Reason: ${err.getMessage}.")
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetLatestSchemaInfoResponse(status = Some(status)))
        }

    override def listSchemas(request: ListSchemasRequest): Future[ListSchemasResponse] =
        logger.info(s"Listing schemas for topic ${request.topic}.")

        try {
            val schemaInfos = adminClient.schemas.getAllSchemas(request.topic).asScala.toList

            val getVersionFutures = schemaInfos
                .map(si => adminClient.schemas.getVersionBySchemaAsync(request.topic, si))
                .map(_.asScala)

            given ExecutionContext = ExecutionContext.global
            val schemaVersions = Await.result(Future.sequence(getVersionFutures), Duration.Inf)

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

        val files: Map[String, CompiledProtobufNativeFile] = protobufnative
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
                              .toMap
                        )
                    case Left(err) => CompiledProtobufNativeFile(compilationError = Some(err))
                (relativePath, compiledFilePb)
            )
            .toMap

        logger.info(s"Compiled ${files.size} protobuf native files.")
        val status = Status(code = Code.OK.index)
        Future.successful(CompileProtobufNativeResponse(status = Some(status), files))

    override def testCompatibility(request: TestCompatibilityRequest): Future[TestCompatibilityResponse] =
        logger.info(s"Testing schema compatibility for topic ${request.topic}.")

        val schemaInfo = request.schemaInfo match
            case Some(spb) => schemaInfoFromPb(spb)
            case None =>
                logger.info(s"Successfully tested schema compatibility for topic ${request.topic}.")
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                return Future.successful(TestCompatibilityResponse(status = Some(status)))

        protobufnative.testCompatibility(topic = request.topic, schemaInfo = schemaInfo) match
            case Right(compatibilityTestResult) =>
                logger.info(s"Successfully tested schema compatibility for topic ${request.topic}.")
                val status = Status(code = Code.OK.index)
                Future.successful(
                  TestCompatibilityResponse(
                    status = Some(status),
                    isCompatible = compatibilityTestResult.isCompatible,
                    strategy = compatibilityTestResult.strategy,
                    incompatibleReason = compatibilityTestResult.incompatibleReason
                  )
                )
            case Left(err) =>
                logger.info(s"Failed to test schema compatibility for topic ${request.topic}. Reason: $err")
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err)
                Future.successful(TestCompatibilityResponse(status = Some(status)))

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
