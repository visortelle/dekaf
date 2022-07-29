package schema.protobufnative

import _root_.client.{adminClient, client}
import org.apache.pulsar.common.schema.SchemaInfo

case class CompatibilityTestResult(isCompatible: Boolean, strategy: String)

def testCompatibility(topic: String, schemaInfo: SchemaInfo): Either[String, CompatibilityTestResult] =
    try {
        val testResult = adminClient.schemas.testCompatibility(topic, schemaInfo)
        Right(CompatibilityTestResult(
            isCompatible = testResult.isCompatibility, 
            strategy = testResult.getSchemaCompatibilityStrategy
        ))
    } catch {
        case err => Left(err.getMessage)
    }