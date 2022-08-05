package schema.protobufnative

import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.PulsarClientException.IncompatibleSchemaException
import org.apache.pulsar.common.schema.SchemaInfo
import scala.jdk.CollectionConverters.*

import scala.util.matching.Regex

case class CompatibilityTestResult(
    isCompatible: Boolean,
    strategy: String,
    incompatibleReason: String,
    incompatibleFullReason: String
)

def testCompatibility(topic: String, schemaInfo: SchemaInfo): CompatibilityTestResult =
    try {
        val testResult = adminClient.schemas.testCompatibility(topic, schemaInfo)

        CompatibilityTestResult(
          isCompatible = testResult.isCompatibility,
          strategy = testResult.getSchemaCompatibilityStrategy,
          incompatibleReason = "",
          incompatibleFullReason = ""
        )
    } catch {
        case err =>
            val betterErrorMessage =
                "(?m)(?<=(IncompatibleSchemaException:|SchemaParseException:|UnrecognizedPropertyException:|IllegalArgumentException:|AvroRuntimeException:))(.*$)".r
                    .findFirstIn(
                      err.getMessage
                    )
                    .getOrElse(err.getMessage)

            CompatibilityTestResult(
              isCompatible = false,
              strategy = "",
              incompatibleReason = betterErrorMessage,
              incompatibleFullReason = err.getMessage
            )
    }
