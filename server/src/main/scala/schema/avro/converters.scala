package schema.avro

import _root_.schema.shared.{AvroDatum, JsonAsBytes, JsonSerDe}
import org.apache.avro.Schema
import tech.allegro.schema.json2avro.converter.JsonAvroConverter

object converters extends JsonSerDe[AvroDatum]:
    def fromJson(schema: Array[Byte], json: JsonAsBytes): Either[Throwable, AvroDatum] =
        try
            val converter = new JsonAvroConverter()
            val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
            val avro = converter.convertToAvro(json, avroSchema)
            Right(avro)
        catch
            case err: Throwable => Left(err)

    def toJson(schema: Array[Byte], data: AvroDatum): Either[Throwable, JsonAsBytes] =
        try
            val converter = new JsonAvroConverter()
            val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
            val json = converter.convertToJson(data, avroSchema)
            Right(json)
        catch
            case err: Throwable => Left(err)