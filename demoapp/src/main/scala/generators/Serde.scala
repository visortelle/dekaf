package generators

import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility
import com.fasterxml.jackson.annotation.PropertyAccessor
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.avro.AvroMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.scala.DefaultScalaModule
import com.google.protobuf.GeneratedMessageV3

import scala.reflect.ClassTag

object Serde:
  def toJsonBytes[T](value: T): Array[Byte] =
    val mapper = new ObjectMapper()
    mapper.registerModule(new JavaTimeModule())
    mapper.registerModule(DefaultScalaModule)
    mapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)
    mapper.writeValueAsBytes(value)

  def fromJson[T](value: Array[Byte])(using tag: ClassTag[T]): T =
    val mapper = new ObjectMapper()
    mapper.registerModule(new JavaTimeModule())
    mapper.registerModule(DefaultScalaModule)
    mapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)
    mapper.readValue(value, tag.runtimeClass.asInstanceOf[Class[T]])

  def toAvro[T](schema: Array[Byte], value: T): Array[Byte] =
    // https://github.com/FasterXML/jackson-dataformats-binary/tree/2.16/avro
    val mapper = new AvroMapper()
    mapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)

    val avroSchema = mapper.schemaFrom(schema.map(_.toChar).mkString) // TODO: cache schema
    mapper.writer(avroSchema).writeValueAsBytes(value)

  def toProto[T <: GeneratedMessageV3](value: T): Array[Byte] = value.toByteArray
