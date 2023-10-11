package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationContains(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Contains,
    containsValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        def getKeyEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""message.key?.includes("${containsValue}")"""
            else
                s"""message.key?.toLowerCase().includes("${containsValue}")"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""message.value?.includes("${containsValue}")"""
            else
                s"""message.value?.toLowerCase().includes("${containsValue.toLowerCase}")"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getJsonValueEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""fieldValue?.includes("${containsValue}")"""
            else
                s"""fieldValue?.toLowerCase().includes("${containsValue}")"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode = if (isCaseSensitive) then
                            s"""message.properties?.${propertyName}?.includes("${containsValue}")"""
                        else
                            s"""message.properties?.${propertyName}?.toLowerCase().includes("${containsValue}")"""

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
                    case SchemaType.JSON => getJsonValueEvalCode
                    case _ => getDefaultValueEvalCode
            case BasicMessageFilterTarget.Properties => getPropertiesEvalCode



object BasicMessageFilterOperationContains:
    def apply(containsValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationContains =
        new BasicMessageFilterOperationContains(
            BasicMessageFilterOperationType.Contains,
            containsValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationContains): Option[(String, Boolean)] =
        Some((op.containsValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationContains] = deriveDecoder[BasicMessageFilterOperationContains]
    given Encoder[BasicMessageFilterOperationContains] = deriveEncoder[BasicMessageFilterOperationContains]
