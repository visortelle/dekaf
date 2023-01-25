package consumer

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.pulsar.client.api.{Message, Schema}
import org.apache.pulsar.client.api.schema.SchemaDefinition
import org.apache.pulsar.client.impl.{MessageImpl, TypedMessageBuilderImpl}
import org.apache.pulsar.client.impl.schema.{
    AvroSchema,
    JSONSchema,
    ProtobufNativeSchema,
    ProtobufNativeSchemaUtils,
    ProtobufSchema,
    SchemaDefinitionImpl,
    SchemaUtils
}
import _root_.schema.avro
import _root_.schema.protobufnative
import com.google.protobuf.Descriptors
import com.google.protobuf.descriptor.FileDescriptorProto
import org.apache.pulsar.client.impl.schema.generic.{GenericAvroReader, GenericProtobufNativeSchema}
import org.apache.pulsar.client.impl.schema.generic.GenericAvroWriter
import org.apache.pulsar.client.impl.schema.writer.AvroWriter
import org.apache.pulsar.client.impl.schema.util.SchemaUtil
import org.apache.pulsar.common.api.proto.MessageMetadata
import schema.protobufnative.FileEntry

import java.nio.charset.StandardCharsets

object convertersTest extends ZIOSpecDefault:
    def spec = suite(s"${this.getClass.toString} - messageValueToJson()")(
        test("AVRO schema") {
            val avroSchemaDefinition = """
            |{
            |  "type": "record",
            |  "name": "User",
            |  "fields": [
            |    {
            |      "name": "name",
            |      "type": "string"
            |    },
            |    {
            |      "name": "favorite_number",
            |      "type": "int"
            |    }
            |  ]
            |}
            """.stripMargin

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.AVRO)
                .schema(avroSchemaDefinition.getBytes)
                .build

            val schemaDefinition: SchemaDefinition[Array[Byte]] =
                SchemaDefinition
                    .builder()
                    .withJsonDef(schemaInfo.getSchemaDefinition)
                    .build

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""
            val avroPayload = avro.converters.fromJson(
                avroSchemaDefinition.getBytes,
                jsonToEncode.getBytes
            ) match
                case Right(value) => value
                case Left(error)  => throw new Exception(s"Failed to parse AVRO message. $error")

            val avroSchema = AvroSchema.of(schemaDefinition)

            val messageMetadata = new MessageMetadata()
            val message = MessageImpl.create[Array[Byte]](
                messageMetadata,
                java.nio.ByteBuffer.wrap(avroPayload),
                avroSchema,
                "topic1"
            )

            val decodedJson = converters.messageValueToJson(message) match
                case Some(value) => value
                case None        => throw new Exception(s"Failed to decode AVRO message.")

            assertTrue(decodedJson == jsonToEncode)
        },
        test("JSON schema") {
            val avroSchemaDefinition =
                """
                  |{
                  |  "type": "record",
                  |  "name": "User",
                  |  "fields": [
                  |    {
                  |      "name": "name",
                  |      "type": "string"
                  |    },
                  |    {
                  |      "name": "favorite_number",
                  |      "type": "int"
                  |    }
                  |  ]
                  |}
                  """.stripMargin

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.JSON)
                .schema(avroSchemaDefinition.getBytes)
                .build

            val schemaDefinition: SchemaDefinition[Array[Byte]] =
                SchemaDefinition
                    .builder()
                    .withJsonDef(schemaInfo.getSchemaDefinition)
                    .build

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""
            val jsonPayload = jsonToEncode.getBytes

            val jsonSchema = JSONSchema.of(schemaDefinition)

            val messageMetadata = new MessageMetadata()
            val message = MessageImpl.create[Array[Byte]](
                messageMetadata,
                java.nio.ByteBuffer.wrap(jsonPayload),
                jsonSchema,
                "topic1"
            )

            val decodedJson = converters.messageValueToJson(message) match
                case Some(value) => value
                case None        => throw new Exception(s"Failed to decode JSON message.")

            assertTrue(decodedJson == jsonToEncode)
        },
        test("PROTOBUF_NATIVE schema") {
            val protoFileName = "user.proto"
            val protoFileContent =
                """
                  |syntax = "proto3";
                  |
                  |package rootPkg;
                  |
                  |message User {
                  |  string name = 1;
                  |  int32 favorite_number = 2;
                  |}
              """.stripMargin

            val compiledFiles = protobufnative.compiler.compileFiles(List(FileEntry(protoFileName, protoFileContent)))
            val protoSchemaDefinition = compiledFiles.files.get(protoFileName) match
                case Some(Right(file)) =>
                    file.schemas.get("User") match
                        case Some(schema) => schema.rawSchema
                        case err          => throw new Exception(s"Failed to compile PROTOBUF_NATIVE message. $err")
                case err => throw new Exception(s"Failed to compile PROTOBUF_NATIVE message. $err")

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.PROTOBUF_NATIVE)
                .schema(protoSchemaDefinition)
                .build

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""
            val protoPayload = jsonToEncode.getBytes

            val protoSchema =
                try
                    GenericProtobufNativeSchema.of(schemaInfo)
                catch {
                    case err =>
                        throw new Exception(s"Failed to create PROTOBUF_NATIVE schema. $err")
                }

            val messageMetadata = new MessageMetadata()
            val message = MessageImpl.create[Array[Byte]](
                messageMetadata,
                java.nio.ByteBuffer.wrap(protoPayload),
                protoSchema.asInstanceOf[Schema[Array[Byte]]],
                "topic1"
            )

            val decodedJson = converters.messageValueToJson(message) match
                case Some(value) => value
                case None        => throw new Exception(s"Failed to decode JSON message.")

            assertTrue(decodedJson == jsonToEncode)
        }
    )
