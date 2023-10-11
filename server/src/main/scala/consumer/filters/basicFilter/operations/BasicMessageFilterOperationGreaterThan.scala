package consumer.filters.basicFilter.operations

import consumer.MessageFilterContext
import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationGreaterThan(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.GreaterThan,
    greaterThanValue: String,
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
                s""""${greaterThanValue}" > message.key"""
            else
                s""""${greaterThanValue.toLowerCase()}" > message.key?.toLowerCase()"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode = if isCaseSensitive then
                s""""${greaterThanValue}" > message.value"""
            else
                s""""${greaterThanValue.toLowerCase()}" > message.value?.toLowerCase()"""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getJsonValueEvalCode: JsCode =
            val resultEvalCode = if isCaseSensitive then
                s""""${greaterThanValue}" > fieldValue"""
            else
                s""""${greaterThanValue.toLowerCase()}" > fieldValue?.toLowerCase()""""

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        def getNumericalStringValueEvalCode: JsCode =
            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return numericalStringGreaterThan("${greaterThanValue}", message.value) ?? false;
               | }
               |""".stripMargin

        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode = if isCaseSensitive then
                            s""""${greaterThanValue}" > message.properties?.${propertyName}"""
                        else
                            s""""${greaterThanValue.toLowerCase()}" > message.properties?.${propertyName}?.toLowerCase()""""

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
                    case SchemaType.INT8 => getNumericalStringValueEvalCode
                    case SchemaType.INT16 => getNumericalStringValueEvalCode
                    case SchemaType.INT32 => getNumericalStringValueEvalCode
                    case SchemaType.INT64 => getNumericalStringValueEvalCode
                    case SchemaType.FLOAT => getNumericalStringValueEvalCode
                    case SchemaType.DOUBLE => getNumericalStringValueEvalCode
                    case _ => getDefaultValueEvalCode
            case BasicMessageFilterTarget.Properties => getPropertiesEvalCode

object BasicMessageFilterOperationGreaterThan:
    def apply(greaterThanValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationGreaterThan =
        new BasicMessageFilterOperationGreaterThan(
            BasicMessageFilterOperationType.GreaterThan,
            greaterThanValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationGreaterThan): Option[(String, Boolean)] =
        Some((op.greaterThanValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationGreaterThan] = deriveDecoder[BasicMessageFilterOperationGreaterThan]
    given Encoder[BasicMessageFilterOperationGreaterThan] = deriveEncoder[BasicMessageFilterOperationGreaterThan]
