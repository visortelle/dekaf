package schema.avro

import tech.allegro.schema.json2avro.converter.AvroConversionException
import tech.allegro.schema.json2avro.converter.JsonAvroConverter
import org.apache.avro.generic.GenericData
import org.apache.avro.Schema

type JsonStringAsBytes = Array[Byte]
type AvroDatum = Array[Byte]

def fromJson(schema: Array[Byte], json: JsonStringAsBytes): Either[String, AvroDatum] =
    try {
        val converter = new JsonAvroConverter()
        val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
        val avro = converter.convertToAvro(json, avroSchema)
        Right(avro)
    } catch {
        case err => Left(err.getMessage)
    }

def toJson(schema: Array[Byte], avroDatum: AvroDatum): Either[String, JsonStringAsBytes] =
    try {
        val converter = new JsonAvroConverter()
        val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
        val json = converter.convertToJson(avroDatum, avroSchema)
        Right(json)
    } catch {
        case err => Left(err.getMessage)
    }
