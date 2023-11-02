package schema.avro

import _root_.schema.shared.{AvroDatum, JsonAsBytes, JsonSerDe}
import org.apache.avro.Schema
import pulsar_auth.logger
import tech.allegro.schema.json2avro.converter.JsonAvroConverter

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

    def avroToJsonSchema(schemaBytes: Array[Byte]): Either[Throwable, String] = ???
/*        import com.fasterxml.jackson.databind.JsonNode
        import com.github.fge.avro.Avro2JsonSchemaProcessor
        import com.github.fge.jackson.JsonLoader
        import com.github.fge.jsonschema.core.report.{DevNullProcessingReport, ProcessingReport}
        import com.github.fge.jsonschema.core.tree.{JsonTree, SimpleJsonTree}

        try {
            val avroProcessor: Avro2JsonSchemaProcessor = new Avro2JsonSchemaProcessor()
            val avroSchema = Schema.Parser().parse(schemaBytes.map(_.toChar).mkString).toString

            val schema: JsonNode = JsonLoader.fromString(avroSchema)
            val tree: JsonTree = new SimpleJsonTree(schema)
            val report: ProcessingReport = new DevNullProcessingReport
            val processor = avroProcessor.rawProcess(report, tree)
            logger.info(s"Avro to Json Schema: ${processor.getBaseNode.asText()}")
            val jsonSchema = processor.getBaseNode.asText()

            Right(jsonSchema)
        } catch {
            case err: Throwable => Left(err)
        }*/
