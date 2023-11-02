package schema

import com.google.protobuf.Descriptors
import com.google.protobuf.ByteString
import com.google.protobuf.DescriptorProtos.{FileDescriptorProto, FileDescriptorSet}
import com.google.protobuf.Descriptors.FileDescriptor
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.schema.{CompileProtobufNativeRequest, CompileProtobufNativeResponse, CompiledProtobufNativeFile, CreateSchemaRequest, CreateSchemaResponse, DeleteSchemaRequest, DeleteSchemaResponse, GetHumanReadableSchemaRequest, GetHumanReadableSchemaResponse, GetLatestSchemaInfoRequest, GetLatestSchemaInfoResponse, GetSchemaExampleMessageRequest, GetSchemaExampleMessageResponse, GetSchemaFieldSelectorsRequest, GetSchemaFieldSelectorsResponse, ListSchemasRequest, ListSchemasResponse, ProtobufNativeSchema, SchemaInfoWithVersion, SchemaServiceGrpc, TestCompatibilityRequest, TestCompatibilityResponse, SchemaInfo as SchemaInfoPb, SchemaType as SchemaTypePb}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.admin.PulsarAdminException

import scala.concurrent.ExecutionContext
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils

import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import net.jimblackler.jsonschemafriend.Schema
import net.jimblackler.jsonschemafriend.SchemaStore
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import _root_.schema.protobufnative
import _root_.schema.avro.converters.avroToJsonSchema
import _root_.schema.protobufnative.converters.protobufToJsonSchema
import com.fasterxml.jackson.databind.ObjectMapper
import com.github.wnameless.json.flattener.JsonFlattener
import net.jimblackler.jsongenerator.{DefaultConfig, Generator}
import pulsar_auth.RequestContext

import scala.concurrent.{Await, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import java.time.{Instant, LocalDate, LocalDateTime, LocalTime}
import java.util.Random as JavaRandom
import scala.util.Random
import scala.concurrent.duration.Duration
import schema.protobufnative.{CompiledFile, FileEntry}

class SchemaServiceImpl extends SchemaServiceGrpc.SchemaService:
    val logger: Logger = Logger(getClass.getName)

    override def createSchema(request: CreateSchemaRequest): Future[CreateSchemaResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val schemaInfos = adminClient.schemas.getAllSchemas(request.topic).asScala.toList

            val getVersionFutures = schemaInfos
                .map(si => adminClient.schemas.getVersionBySchemaAsync(request.topic, si))
                .map(_.asScala)

            given ExecutionContext = ExecutionContext.global
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
                    case Right(f) => compileFileToPb(f)
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

        val compatibilityTestResult = protobufnative.schemaCompatibility.test(pulsarAdmin = adminClient, topic = request.topic, schemaInfo = schemaInfo)

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

    private def generateSampleJson(jsonSchema: String): String =
        val config = DefaultConfig.build
            .setPedanticTypes(false)
            .setGenerateNulls(false)
            .setGenerateMinimal(false)
            .setGenerateAdditionalProperties(false)
            .setNonRequiredPropertyChance(0.6f)
            .get
        val schemaStore = SchemaStore(true)
        val schema: Schema = schemaStore.loadSchemaJson(jsonSchema)
        val generator: Generator = Generator(config, schemaStore, JavaRandom())

        val jsonObject: Object = generator.generate(schema, 16)

        val objectMapper = ObjectMapper()
        val jsonString = objectMapper.writeValueAsString(jsonObject)

        jsonString

    private def getJsonSchema(schemaInfo: SchemaInfo): Either[Throwable, String] =
        schemaInfo.getType match
            //TODO: Add support for AVRO and JSON (create a converter from AVRO Schema to JSON Schema)
            //case SchemaType.AVRO => avroToJsonSchema(schemaInfo.getSchema)
            //case SchemaType.JSON => Right(schemaInfo.getSchema.map(_.toChar).mkString)
            case SchemaType.PROTOBUF_NATIVE => protobufToJsonSchema(schemaInfo.getSchema)
            case _ => Left(Exception("Unsupported schema type"))

    override def getSchemaFieldSelectors(request: GetSchemaFieldSelectorsRequest): Future[GetSchemaFieldSelectorsResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()
        val schemaInfoWithVersion = adminClient.schemas.getSchemaInfoWithVersion(request.topic)

        schemaInfoWithVersion.getSchemaInfo.getType match
            case /*SchemaType.AVRO | SchemaType.JSON |*/ SchemaType.PROTOBUF_NATIVE =>
                val jsonSchema = getJsonSchema(schemaInfoWithVersion.getSchemaInfo)

                val fieldSelectors = jsonSchema match
                    case Right(jsonSchema) =>
                        val jsonSample = generateSampleJson(jsonSchema)

                        JsonFlattener.flattenAsMap(jsonSample).asScala.keys.toSeq
                    case Left(err) =>
                        val status = Status(
                            code = Code.INVALID_ARGUMENT.index,
                            message = err.getMessage
                        )

                        return Future.successful(
                            GetSchemaFieldSelectorsResponse(
                                status = Some(status)
                            )
                        )

                val status = Status(code = Code.OK.index)
                Future.successful(
                    GetSchemaFieldSelectorsResponse(
                        status = Some(status),
                        fieldSelectors = fieldSelectors
                    )
                )
            case _ =>
                val status = Status(
                    code = Code.INVALID_ARGUMENT.index,
                    message = "Provided schema type is not supported"
                )

                Future.successful(
                    GetSchemaFieldSelectorsResponse(
                        status = Some(status)
                    )
                )
    override def getSchemaExampleMessage(request: GetSchemaExampleMessageRequest): Future[GetSchemaExampleMessageResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()
        val schemaInfo = adminClient.schemas.getSchemaInfo(request.topic, request.schemaVersion)

        val exampleMessage = schemaInfo.getType match
            case SchemaType.NONE | SchemaType.BYTES => String(Random.nextBytes(100))
            case SchemaType.STRING => Random.nextString(10)
            case SchemaType.BOOLEAN => Random.nextBoolean().toString
            case SchemaType.INT8 => Random.nextInt(128).toByte.toString
            case SchemaType.INT16 => Random.nextInt(32767).toShort.toString
            case SchemaType.INT32 => Random.nextInt().toString
            case SchemaType.INT64 => Random.nextLong().toString
            case SchemaType.FLOAT => Random.nextFloat().toString
            case SchemaType.DOUBLE => Random.nextDouble().toString
            case SchemaType.DATE => s"${Random.nextInt(2023 - 1900) + 1900}-${Random.nextInt(12) + 1}-${Random.nextInt(28) + 1}"
            case SchemaType.TIME => f"${Random.nextInt(24)}%02d:${Random.nextInt(60)}%02d:${Random.nextInt(60)}%02d"
            case SchemaType.TIMESTAMP => Random.nextLong().toString
            case SchemaType.INSTANT => Random.nextLong().toString
            case SchemaType.LOCAL_DATE => s"${Random.nextInt(2023 - 1900) + 1900}-${Random.nextInt(12) + 1}-${Random.nextInt(28) + 1}"
            case SchemaType.LOCAL_TIME => f"${Random.nextInt(24)}%02d:${Random.nextInt(60)}%02d:${Random.nextInt(60)}%02d"
            case SchemaType.LOCAL_DATE_TIME => s"${Random.nextInt(2023 - 1900) + 1900}-${Random.nextInt(12) + 1}-${Random.nextInt(28) + 1}T${Random.nextInt(24)}:${Random.nextInt(60)}:${Random.nextInt(60)}"
            case /*SchemaType.JSON | SchemaType.AVRO |*/ SchemaType.PROTOBUF_NATIVE =>
                val jsonSchema = getJsonSchema(schemaInfo)

                jsonSchema match
                    case Right(jsonSchema) =>
                        val jsonSample = generateSampleJson(jsonSchema)

                        jsonSample
                    case Left(err) =>
                        val status = Status(
                            code = Code.INVALID_ARGUMENT.index,
                            message = err.getMessage
                        )

                        return Future.successful(
                            GetSchemaExampleMessageResponse(
                                status = Some(status)
                            )
                        )
            case _ =>
                val status = Status(
                    code = Code.INVALID_ARGUMENT.index,
                    message = "Provided schema type is not supported"
                )

                return Future.successful(
                    GetSchemaExampleMessageResponse(
                        status = Some(status)
                    )
                )

        val status = Status(code = Code.OK.index)
        Future.successful(
            GetSchemaExampleMessageResponse(
                status = Some(status),
                exampleMessage = exampleMessage
            )
        )
