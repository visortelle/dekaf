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
    regexPattern: String
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        def getKeyEvalCode: JsCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    const regex = ${regexPattern};
               |    return Boolean(message.key?.replaceAll('\"', '\\\\' + '\"').match(regex));
               | })()
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    const regex = ${regexPattern};
               |    return Boolean(message.value?.replaceAll('\"', '\\\\' + '\"').match(regex));
               | })()
               |""".stripMargin
            
        def getAccumEvalCode: JsCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    const regex = ${regexPattern};
               |    return Boolean(message.accum?.replaceAll('\"', '\\\\' + '\"').match(regex));
               | })()
               |""".stripMargin

        def getJsonValueEvalCode: JsCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    const regex = ${regexPattern};
               |    return Boolean(fieldValue?.match(regex));
               | })()
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        s"""Boolean(message.properties?["${propertyName}"]?.replaceAll('\"', '\\\\' + '\"').match(regex))"""
                    }.mkString(s" ${modeOperator} ")

                    s"""
                       | (() => {
                       |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
                       |
                       |    const regex = ${regexPattern};
                       |    return ${propertiesEvalCode};
                       | })()
                       |""".stripMargin
                case _ => BasicMessageFilterOperation.getSucceededEvalCode

        filter.target match
            case BasicMessageFilterTarget.Unspecified => BasicMessageFilterOperation.getSucceededEvalCode
            case BasicMessageFilterTarget.Key => getKeyEvalCode
            case BasicMessageFilterTarget.Value =>
                schemaType match
                    case SchemaType.JSON => getJsonValueEvalCode
                    case SchemaType.AVRO => getJsonValueEvalCode
                    case SchemaType.PROTOBUF_NATIVE => getJsonValueEvalCode
                    case _ => getDefaultValueEvalCode
            case BasicMessageFilterTarget.Properties => getPropertiesEvalCode
            case BasicMessageFilterTarget.Accum => getAccumEvalCode

object BasicMessageFilterOperationRegex:
    def apply(regexPattern: String): BasicMessageFilterOperationRegex =
        new BasicMessageFilterOperationRegex(
            BasicMessageFilterOperationType.Regex,
            regexPattern
        )

    def unapply(op: BasicMessageFilterOperationRegex): Option[String] =
        Some(op.regexPattern)

    given Decoder[BasicMessageFilterOperationRegex] = deriveDecoder[BasicMessageFilterOperationRegex]
    given Encoder[BasicMessageFilterOperationRegex] = deriveEncoder[BasicMessageFilterOperationRegex]



