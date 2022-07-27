package schema

import _root_.client.{adminClient, client}
import com.google.protobuf.Descriptors
import com.google.protobuf.ByteString
import com.google.protobuf.DescriptorProtos.{FileDescriptorProto, FileDescriptorSet}
import com.google.protobuf.Descriptors.FileDescriptor
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.schema.{CompileProtobufFileRequest, CompileProtobufFileResponse, CreateSchemaRequest, CreateSchemaResponse, DeleteSchemaRequest, DeleteSchemaResponse, GetLatestSchemaInfoRequest, GetLatestSchemaInfoResponse, ListSchemasRequest, ListSchemasResponse, SchemaServiceGrpc, SchemaInfo as SchemaInfoPb, SchemaType as SchemaTypePb}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.admin.PulsarAdminException
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils

import scala.sys.process.*
import scala.jdk.CollectionConverters.*
import org.apache.pulsar.client.api.{Producer, ProducerAccessMode}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}

import java.io.FileInputStream
import java.nio.file.Paths
import scala.concurrent.Future
import com.google.protobuf.DescriptorProtos.FileDescriptorProto
import com.google.protobuf.Descriptors.DescriptorValidationException
import org.apache.pulsar.common.protocol.schema.ProtobufNativeSchemaData

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

    override def compileProtobufFile(request: CompileProtobufFileRequest): Future[CompileProtobufFileResponse] =
        try {
            val descriptorSetOut = "/tmp/descriptor_set_out.pb"
            logger.info(s"Compiling protobuf native schema for: ${request.protoFilePath}")

            val protosDir = Paths.get(request.protoFilePath).getParent.toAbsolutePath
            val protoFile = Paths.get(request.protoFilePath).getFileName.toString

            val protocCommand = s"protoc --descriptor_set_out=${descriptorSetOut} -I $protosDir ${protoFile}"
            Seq("sh", "-c", s"set -e; ${protocCommand}").! == 0

            val descriptorSet = FileDescriptorSet.parseFrom(new FileInputStream(descriptorSetOut))
            val fileDescriptor = buildFileDescriptor(descriptorSet.getFile(0), Map.empty)
            val messageDescriptor = fileDescriptor.findMessageTypeByName("MySchema")
            val nativeProtobufSchema = ProtobufNativeSchemaUtils.serialize(messageDescriptor)

            val status = Status(code = Code.OK.index)
            Future.successful(CompileProtobufFileResponse(
                status = Some(status),
                nativeProtobufSchema = ByteString.copyFrom(nativeProtobufSchema)
            ))
        } catch {
            case err =>
                logger.error(s"Unable to compile protobuf file ${request.protoFilePath}", err)

                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CompileProtobufFileResponse(status = Some(status)))
        }



//val d = adminClient.schemas().testCompatibility()

//val b = FileDescriptorSet.parseFrom()
//val d = ProtobufNativeSchemaUtils.serialize(b)
