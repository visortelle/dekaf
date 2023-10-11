package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType
import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode

case class BasicMessageFilterOperationRegex(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Regex,
    regexPattern: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        val regexValue = if isCaseSensitive then
            s"/${regexPattern}/g"
        else
            s"/${regexPattern}/gi"

        def getKeyEvalCode: JsCode =
            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    const regex = ${regexValue};
               |    return Boolean(message.key?.match(regex));
               | }
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    const regex = ${regexValue};
               |    return Boolean(message.value?.match(regex));
               | }
               |""".stripMargin

        def getJsonValueEvalCode: JsCode =
            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    const regex = ${regexValue};
               |    return Boolean(fieldValue?.match(regex));
               | }
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        s"Boolean(message.properties?.${propertyName}?.match(regex))"
                    }.mkString(s" ${modeOperator} ")

                    s"""
                       | () => {
                       |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
                       |
                       |    const regex = ${regexValue};
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

object BasicMessageFilterOperationRegex:
    def apply(regexPattern: String, isCaseSensitive: Boolean): BasicMessageFilterOperationRegex =
        new BasicMessageFilterOperationRegex(
            BasicMessageFilterOperationType.Regex,
            regexPattern,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationRegex): Option[(String, Boolean)] =
        Some((op.regexPattern, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationRegex] = deriveDecoder[BasicMessageFilterOperationRegex]
    given Encoder[BasicMessageFilterOperationRegex] = deriveEncoder[BasicMessageFilterOperationRegex]



