package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationEndsWith(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.EndsWith,
    endsWithSubstring: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        val resultEvalCode = if isCaseSensitive then
            s"""message.value?.replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""
        else
            s"""message.value?.toLowerCase().replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring.toLowerCase()}"))"""

        def getKeyEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""message.key?.replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""
            else
                s"""message.key?.toLowerCase().replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""message.value?.replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""
            else
                s"""message.value?.toLowerCase().replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring.toLowerCase}"))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin
        
        def getAccumEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""message.accum?.replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""
            else
                s"""message.accum?.toLowerCase().replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring.toLowerCase}"))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin
            
        def getJsonValueEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""fieldValue?.replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""
            else
                s"""fieldValue?.toLowerCase().replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode = if (isCaseSensitive) then
                            s"""message.properties?["${propertyName}"]?.replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""
                        else
                            s"""message.properties?["${propertyName}"]?.toLowerCase().replaceAll('\"', '\\\\' + '\"').endsWith(decodeURIComponent("${endsWithSubstring}"))"""

                        s"(${resultEvalCode} ?? false)"

                    }.mkString(s" ${modeOperator} ")

                    s"""
                       | (() => {
                       |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
                       |
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


object BasicMessageFilterOperationEndsWith:
    def apply(endsWithSubstring: String, isCaseSensitive: Boolean): BasicMessageFilterOperationEndsWith =
        new BasicMessageFilterOperationEndsWith(
            BasicMessageFilterOperationType.EndsWith,
            endsWithSubstring,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationEndsWith): Option[(String, Boolean)] =
        Some((op.endsWithSubstring, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationEndsWith] = deriveDecoder[BasicMessageFilterOperationEndsWith]
    given Encoder[BasicMessageFilterOperationEndsWith] = deriveEncoder[BasicMessageFilterOperationEndsWith]

