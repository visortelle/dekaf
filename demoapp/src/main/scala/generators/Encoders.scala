package generators

import org.apache.avro.Schema
import com.fasterxml.jackson.dataformat.avro.{AvroFactory, AvroMapper}
import com.fasterxml.jackson.dataformat.protobuf.ProtobufMapper
import com.fasterxml.jackson.annotation.PropertyAccessor
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility
import com.google.protobuf.GeneratedMessageV3
import io.circe.*
import io.circe.syntax.*
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

object Encoders:
  def toJson[T](using encoder: io.circe.Encoder[T])(value: T): Array[Byte] =
    value.asJson.toString.getBytes("UTF-8")

  def toAvro[T](schema: Array[Byte], value: T): Array[Byte] =
    // https://github.com/FasterXML/jackson-dataformats-binary/tree/2.16/avro
    val mapper = new AvroMapper()
    mapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)
    val avroSchema = mapper.schemaFrom(schema.map(_.toChar).mkString) // TODO: cache schema
    mapper.writer(avroSchema).writeValueAsBytes(value)

  def toProto[T <: GeneratedMessageV3](value: T): Array[Byte] = value.toByteArray
