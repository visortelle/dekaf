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
    GetLatestSchemaInfoRequest,
    GetLatestSchemaInfoResponse,
    ListSchemasRequest,
    ListSchemasResponse,
    ProtobufNativeSchema,
    SchemaInfo as SchemaInfoPb,
    SchemaServiceGrpc,
    SchemaType as SchemaTypePb,
    TestCompatibilityRequest,
    TestCompatibilityResponse
}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.admin.PulsarAdminException

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import _root_.schema.protobufnative

import scala.concurrent.Future
import java.util

class SchemaServiceImpl extends SchemaServiceGrpc.SchemaService:
    val logger: Logger = Logger(getClass.getName)

    override def createSchema(request: CreateSchemaRequest): Future[CreateSchemaResponse] =
        request.schemaInfo match
            case Some(s) =>
                val schemaInfo = SchemaInfo.builder
                    .name(s.name)
                    .`type`(schemaTypeFromPb(s.`type`))
                    .properties(s.properties.asJava)
                    .schema(s.schema.toByteArray)
                    .build()

                try {
                    adminClient.schemas.createSchema(request.topic, schemaInfo)

                    val status = Status(code = Code.OK.index)
                    Future.successful(CreateSchemaResponse(status = Some(status)))
                } catch {
                    case err =>
                        println(err)
                        val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                        Future.successful(CreateSchemaResponse(status = Some(status)))
                }

            case _ =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                Future.successful(CreateSchemaResponse(status = Some(status)))

    override def deleteSchema(request: DeleteSchemaRequest): Future[DeleteSchemaResponse] = ???

    override def getLatestSchemaInfo(request: GetLatestSchemaInfoRequest): Future[GetLatestSchemaInfoResponse] =
        try {
            val schemaInfoWithVersion = adminClient.schemas.getSchemaInfoWithVersion(request.topic)
            val status = Status(code = Code.OK.index)

            Future.successful(
              GetLatestSchemaInfoResponse(
                status = Some(status),
                schemaInfo = Some(schemaInfoToPb(schemaInfoWithVersion.getSchemaInfo)),
                schemaVersion = Option(schemaInfoWithVersion.getVersion)
              )
            )
        } catch {
            case (_: PulsarAdminException.NotFoundException) =>
                val status = Status(code = Code.OK.index)
                Future.successful(GetLatestSchemaInfoResponse(status = Some(status), schemaInfo = None, schemaVersion = None))
            case (err: PulsarAdminException) =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetLatestSchemaInfoResponse(status = Some(status)))
        }

    override def listSchemas(request: ListSchemasRequest): Future[ListSchemasResponse] =
        try {
            val schemaInfos = adminClient.schemas.getAllSchemas(request.topic).asScala.toSeq.map(schemaInfoToPb(_))
            val status = Status(code = Code.OK.index)
            Future.successful(ListSchemasResponse(status = Some(status), schemaInfos))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ListSchemasResponse(status = Some(status)))
        }

    override def compileProtobufNative(request: CompileProtobufNativeRequest): Future[CompileProtobufNativeResponse] =
        val filesToCompile = request.files
            .filter(f => f.relativePath.endsWith(".proto"))
            .map(f => protobufnative.FileEntry(relativePath = f.relativePath, content = f.content))

        logger.info(s"Compiling ${filesToCompile.size} protobuf native files")

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

        val status = Status(code = Code.OK.index)
        Future.successful(CompileProtobufNativeResponse(status = Some(status), files))

    override def testCompatibility(request: TestCompatibilityRequest): Future[TestCompatibilityResponse] =
        val schemaInfo = request.schemaInfo match
            case Some(spb) => schemaInfoFromPb(spb)
            case None =>
                val status = Status(code = Code.INVALID_ARGUMENT.index)
                return Future.successful(TestCompatibilityResponse(status = Some(status)))

        protobufnative.testCompatibility(topic = request.topic, schemaInfo = schemaInfo) match
            case Right(compatibilityTestResult) =>
                val status = Status(code = Code.OK.index)
                Future.successful(
                  TestCompatibilityResponse(
                    status = Some(status),
                    isCompatible = compatibilityTestResult.isCompatible,
                    strategy = compatibilityTestResult.strategy
                  )
                )
            case Left(err) =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err)
                Future.successful(TestCompatibilityResponse(status = Some(status)))
