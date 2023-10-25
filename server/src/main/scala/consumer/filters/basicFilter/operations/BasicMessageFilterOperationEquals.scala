package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationEquals(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Equals,
    equalToValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        def getKeyEvalCode: JsCode =
            val resultEvalCode = if isCaseSensitive then
                s"""message.key.replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue}")"""
            else
                s"""message.key?.toLowerCase().replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue.toLowerCase()}")"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode = if isCaseSensitive then
                s"""message.value.replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue}")"""
            else
                s"""message.value?.toLowerCase().replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue.toLowerCase()}")"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getAccumEvalCode: JsCode =
            val resultEvalCode = if isCaseSensitive then
                s"""message.accum.replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue}")"""
            else
                s"""message.accum?.toLowerCase().replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue.toLowerCase()}")"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getJsonValueEvalCode: JsCode =
            val resultEvalCode = if (isCaseSensitive) then
                s"""fieldValue.replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue}")"""
            else
                s"""fieldValue?.toLowerCase().replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue.toLowerCase()}")"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getNumericalStringValueEvalCode: JsCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return numericalStringEquals(decodeURIComponent("${equalToValue}"), message.value) ?? false;
               | })()
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode = if (isCaseSensitive) then
                            s"""message.properties?["${propertyName}"].replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue}")"""
                        else
                            s"""message.properties?["${propertyName}"]?.toLowerCase().replaceAll('\"', '\\\\' + '\"') === decodeURIComponent("${equalToValue.toLowerCase()}")"""

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
                    case SchemaType.INT8 => getNumericalStringValueEvalCode
                    case SchemaType.INT16 => getNumericalStringValueEvalCode
                    case SchemaType.INT32 => getNumericalStringValueEvalCode
                    case SchemaType.INT64 => getNumericalStringValueEvalCode
                    case SchemaType.FLOAT => getNumericalStringValueEvalCode
                    case SchemaType.DOUBLE => getNumericalStringValueEvalCode
                    case _ => getDefaultValueEvalCode
            case BasicMessageFilterTarget.Properties => getPropertiesEvalCode
            case BasicMessageFilterTarget.Accum => getAccumEvalCode

object BasicMessageFilterOperationEquals:
    def apply(equalToValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationEquals =
        new BasicMessageFilterOperationEquals(
            BasicMessageFilterOperationType.Equals,
            equalToValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationEquals): Option[(String, Boolean)] =
        Some((op.equalToValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationEquals] = deriveDecoder[BasicMessageFilterOperationEquals]
    given Encoder[BasicMessageFilterOperationEquals] = deriveEncoder[BasicMessageFilterOperationEquals]
