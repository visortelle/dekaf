package consumer.filters.basicFilter.operations

import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import consumer.{JsCode, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationIsTruthy(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.IsTruthy
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        def setupIsTruthyFunction: JsCode =
            s"""const isTruthy = (value) => {
               |  if (value) {
               |    return true;
               |  } else {
               |    return false;
               |  }
               |};
               |""".stripMargin

        def getKeyEvalCode: JsCode =
            val resultEvalCode =
                s"""isTruthy(message.key?.toLowerCase())"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${setupIsTruthyFunction}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode =
                s"""isTruthy(message.value?.toLowerCase())"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${setupIsTruthyFunction}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode =
                            s"""isTruthy(message.properties?.${propertyName}?.toLowerCase())"""

                        s"(${resultEvalCode} ?? false)"

                    }.mkString(s" ${modeOperator} ")

                    s"""
                       | () => {
                       |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
                       |
                       |    return ${propertiesEvalCode};
                       | }
                       |""".stripMargin
                case _ => BasicMessageFilterOperation.getSucceededEvalCode

        filter.target match
            case BasicMessageFilterTarget.Unspecified => BasicMessageFilterOperation.getSucceededEvalCode
            case BasicMessageFilterTarget.Key => getKeyEvalCode
            case BasicMessageFilterTarget.Value =>
                schemaType match
                    case _ => getDefaultValueEvalCode
            case BasicMessageFilterTarget.Properties => getPropertiesEvalCode

object BasicMessageFilterOperationIsTruthy:
    def apply(targetString: String): BasicMessageFilterOperationIsTruthy =
        new BasicMessageFilterOperationIsTruthy(
            BasicMessageFilterOperationType.IsTruthy
        )

    def unapply(op: BasicMessageFilterOperationIsTruthy): Boolean = true

    given Decoder[BasicMessageFilterOperationIsTruthy] = deriveDecoder[BasicMessageFilterOperationIsTruthy]
    given Encoder[BasicMessageFilterOperationIsTruthy] = deriveEncoder[BasicMessageFilterOperationIsTruthy]
