package consumer.filters.basicFilter.operations

import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import consumer.{JsCode, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationLessThanOrEquals(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.LessThanOrEqual,
    lessThanOrEqualsValue: String
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        def setupCompareValuesFunctionCode: JsCode =
            s"""
               | const compareValues = (value, valueToCompare) => {
               |  try {
               |    const parsedValue = JSON.parse(value);
               |    if (typeof parsedValue === 'number' || typeof parsedValue === 'boolean' || typeof parsedValue === 'bigint') {
               |      return parsedValue <= valueToCompare;
               |    }
               |  } catch (e) {
               |
               |  }
               |  return true;
               | }
               |""".stripMargin

        def getKeyEvalCode: JsCode =
            val resultEvalCode =
                s"""
                   | ${setupCompareValuesFunctionCode}
                   |
                   | return compareValues(decodeURIComponent("${lessThanOrEqualsValue}"), message.key?.replaceAll('\"', '\\\\' + '\"')) ?? false;
                   |""".stripMargin

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    ${resultEvalCode}
               | })()
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode =
                s"""
                   | ${setupCompareValuesFunctionCode}
                   |
                   | return compareValues(decodeURIComponent("${lessThanOrEqualsValue}"), message.value?.replaceAll('\"', '\\\\' + '\"')) ?? false;
                   |""".stripMargin

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    ${resultEvalCode}
               | })()
               |""".stripMargin

        def getAccumEvalCode: JsCode =
            val resultEvalCode =
                s"""
                   | ${setupCompareValuesFunctionCode}
                   |
                   | return compareValues(decodeURIComponent("${lessThanOrEqualsValue}"), message.accum?.replaceAll('\"', '\\\\' + '\"')) ?? false;
                   |""".stripMargin

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    ${resultEvalCode}
               | })()
               |""".stripMargin

        def getNumericalStringValueEvalCode: JsCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return numericalStringGreaterThan("${lessThanOrEqualsValue}", message.value?.replaceAll('\"', '\\\\' + '\"')) ?? false;
               | })()
               |""".stripMargin

        def getJsonValueEvalCode: JsCode =
            val resultEvalCode =
                s"""
                   | ${setupCompareValuesFunctionCode}
                   |
                   | return compareValues(decodeURIComponent("${lessThanOrEqualsValue}"), fieldValue?.replaceAll('\"', '\\\\' + '\"')) ?? false;
                   |""".stripMargin

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    ${resultEvalCode}
               | })()
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode = s"""compareValues(decodeURIComponent("${lessThanOrEqualsValue}"), message.properties?["${propertyName}"]?.replaceAll('\"', '\\\\' + '\"'))"""

                        s"""
                           |(${resultEvalCode} ?? false)
                           |""".stripMargin

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
                    case SchemaType.BOOLEAN => getDefaultValueEvalCode
                    case SchemaType.INT8 => getNumericalStringValueEvalCode
                    case SchemaType.INT16 => getNumericalStringValueEvalCode
                    case SchemaType.INT32 => getNumericalStringValueEvalCode
                    case SchemaType.INT64 => getNumericalStringValueEvalCode
                    case SchemaType.FLOAT => getNumericalStringValueEvalCode
                    case SchemaType.DOUBLE => getNumericalStringValueEvalCode
                    case _ => BasicMessageFilterOperation.getSucceededEvalCode
            case BasicMessageFilterTarget.Properties => getPropertiesEvalCode
            case BasicMessageFilterTarget.Accum => getAccumEvalCode

object BasicMessageFilterOperationLessThanOrEquals:
    def apply(lessThanOrEqualsValue: String): BasicMessageFilterOperationLessThanOrEquals =
        new BasicMessageFilterOperationLessThanOrEquals(
            BasicMessageFilterOperationType.LessThanOrEqual,
            lessThanOrEqualsValue
        )

    def unapply(op: BasicMessageFilterOperationLessThanOrEquals): Option[String] =
        Some(op.lessThanOrEqualsValue)

    given Decoder[BasicMessageFilterOperationLessThanOrEquals] = deriveDecoder[BasicMessageFilterOperationLessThanOrEquals]
    given Encoder[BasicMessageFilterOperationLessThanOrEquals] = deriveEncoder[BasicMessageFilterOperationLessThanOrEquals]
