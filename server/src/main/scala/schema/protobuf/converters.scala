package schema.protobuf

import tech.allegro.schema.json2avro.converter.AvroConversionException
import tech.allegro.schema.json2avro.converter.JsonAvroConverter
import org.apache.avro.generic.GenericData
import org.apache.avro.Schema
import _root_.schema.shared.{JsonSerDe, JsonAsBytes, Proto3Datum}

object converters extends JsonSerDe[Proto3Datum]:
    def fromJson(schema: Array[Byte], json: JsonAsBytes): Either[Throwable, Proto3Datum] =
        try {
            val converter = new JsonAvroConverter()
            val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
            val avro = converter.convertToAvro(json, avroSchema)
            Right(avro)
        } catch {
            case err: Throwable => Left(err)
        }

    def toJson(schema: Array[Byte], data: Proto3Datum): Either[Throwable, JsonAsBytes] =
        try {
            val converter = new JsonAvroConverter()
            val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
            val json = converter.convertToJson(data, avroSchema)
            Right(json)
        } catch {
            case err: Throwable => Left(err)
        }
