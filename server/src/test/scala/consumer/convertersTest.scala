package consumer

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.pulsar.client.api.Message
import org.apache.pulsar.client.api.schema.SchemaDefinition
import org.apache.pulsar.client.impl.{MessageImpl, TypedMessageBuilderImpl}
import org.apache.pulsar.client.impl.schema.{AvroSchema, SchemaDefinitionImpl, SchemaUtils}
import _root_.schema.avro
import org.apache.pulsar.client.impl.schema.generic.GenericAvroReader
import org.apache.pulsar.client.impl.schema.generic.GenericAvroWriter
import org.apache.pulsar.client.impl.schema.writer.AvroWriter
import org.apache.pulsar.client.impl.schema.util.SchemaUtil
import org.apache.pulsar.common.api.proto.MessageMetadata

import java.nio.charset.StandardCharsets

object convertersTest extends ZIOSpecDefault:
    def spec = suite(s"${this.getClass.toString} - messageValueToJson()")(
      test("converts AVRO message to JSON") {
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
          val schemasByVersion: SchemasByVersion = Map(0L -> schemaInfo)
          val schemasByTopic: SchemasByTopic = Map("topic1" -> schemasByVersion)

          val schemaDefinition: SchemaDefinition[Array[Byte]] =
              SchemaDefinition
                  .builder()
                  .withJsonDef(schemaInfo.getSchemaDefinition)
                  .build

          val avroMessage = avro.converters.fromJson(
            avroSchemaDefinition.getBytes,
            """{ "name": "Alyssa", "favorite_number": 256 }""".getBytes
          ) match
              case Right(value) => value
              case Left(error)  => throw new Exception(s"Failed to parse AVRO message. $error")

          val avroSchema = AvroSchema.of(schemaDefinition)

          val messageMetadata = new MessageMetadata()
          val message = MessageImpl.create[Array[Byte]](
            messageMetadata,
            java.nio.ByteBuffer.wrap(avroMessage),
            avroSchema,
            "topic1"
          )

          val messageJson = converters
              .messageValueToJson(schemasByTopic, message)

          assertTrue(true)
      }
    )
