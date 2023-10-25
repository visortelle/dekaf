package schema.avro

import tech.allegro.schema.json2avro.converter.AvroConversionException
import tech.allegro.schema.json2avro.converter.JsonAvroConverter
import org.apache.avro.generic.GenericData
import org.apache.avro.Schema
import _root_.schema.shared.{JsonSerDe, JsonAsBytes, AvroDatum}
import com.fasterxml.jackson.databind.JsonNode
import com.github.fge.avro.Avro2JsonSchemaProcessor
import com.github.fge.jackson.JsonLoader
import com.github.fge.jsonschema.core.report.{DevNullProcessingReport, ProcessingReport}
import com.github.fge.jsonschema.core.tree.{JsonTree, SimpleJsonTree}

object converters extends JsonSerDe[AvroDatum]:
    def fromJson(schema: Array[Byte], json: JsonAsBytes): Either[Throwable, AvroDatum] =
        try {
            val converter = new JsonAvroConverter()
            val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
            val avro = converter.convertToAvro(json, avroSchema)
            Right(avro)
        } catch {
            case err: Throwable => Left(err)
        }

    def toJson(schema: Array[Byte], data: AvroDatum): Either[Throwable, JsonAsBytes] =
        try {
            val converter = new JsonAvroConverter()
            val avroSchema = Schema.Parser().parse(schema.map(_.toChar).mkString)
            val json = converter.convertToJson(data, avroSchema)
            Right(json)
        } catch {
            case err: Throwable => Left(err)
        }

    def avroToJsonSchema(schemaBytes: Array[Byte]): Either[Throwable, String] =
        try {
            val avroProcessor: Avro2JsonSchemaProcessor = new Avro2JsonSchemaProcessor()
            val avroSchema = Schema.Parser().parse(schemaBytes.map(_.toChar).mkString).toString

            val schema: JsonNode = JsonLoader.fromString(avroSchema)
            val tree: JsonTree = new SimpleJsonTree(schema)
            val report: ProcessingReport = new DevNullProcessingReport
            val processor = avroProcessor.rawProcess(report, tree)
            val jsonSchema = processor.getBaseNode.asText()

            Right(jsonSchema)
        } catch {
            case err: Throwable => Left(err)
        }
