package schema.protobufnative

import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.PulsarClientException.IncompatibleSchemaException
import org.apache.pulsar.common.schema.SchemaInfo

import scala.util.matching.Regex

case class CompatibilityTestResult(isCompatible: Boolean, strategy: String, incompatibleReason: String)

def testCompatibility(topic: String, schemaInfo: SchemaInfo): Either[String, CompatibilityTestResult] =
    try {
        val testResult = adminClient.schemas.testCompatibility(topic, schemaInfo)
        Right(CompatibilityTestResult(
            isCompatible = testResult.isCompatibility,
            strategy = testResult.getSchemaCompatibilityStrategy,
            incompatibleReason = ""
        ))
    } catch {
        case err =>
            val betterErrorMessage = "(?m)(?<=IncompatibleSchemaException:)(.*$)".r.findFirstIn(err.getMessage)
            betterErrorMessage match
                case Some(msg) =>
                    Right(CompatibilityTestResult(
                        isCompatible = false,
                        strategy = "",
                        incompatibleReason = msg.strip()
                    ))
                case _ => Left(err.getMessage)
    }
