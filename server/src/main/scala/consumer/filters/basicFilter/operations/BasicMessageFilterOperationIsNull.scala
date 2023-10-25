package consumer.filters.basicFilter.operations

import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import consumer.{JsCode, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationIsNull(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.IsNull
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        def setupIsNullFunction: JsCode =
            s"""const isNullOrStringNull = (value) => {
               |  return value === null || value === "null";
               |};
               |""".stripMargin

        def getKeyEvalCode: JsCode =
            val resultEvalCode =
                s"""isNullOrStringNull(message.key?.toLowerCase().replaceAll('\"', '\\\\' + '\"'))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${setupIsNullFunction}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin

        def getDefaultValueEvalCode: JsCode =
            val resultEvalCode =
                s"""isNullOrStringNull(message.value?.toLowerCase().replaceAll('\"', '\\\\' + '\"'))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${setupIsNullFunction}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin
            
        def getAccumEvalCode: JsCode =
            val resultEvalCode =
                s"""isNullOrStringNull(message.accum?.toLowerCase().replaceAll('\"', '\\\\' + '\"'))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${setupIsNullFunction}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin
        
        def getJsonValueEvalCode: JsCode =
            val resultEvalCode = 
                s"""isNullOrStringNull(fieldValue?.toLowerCase().replaceAll('\"', '\\\\' + '\"'))"""

            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |    ${MessageFilterContext.setupFieldValueCode(filter.selector)}
               |    ${setupIsNullFunction}
               |
               |    return ${resultEvalCode} ?? false;
               | })()
               |""".stripMargin
            
        def getPropertiesEvalCode: JsCode =
            filter.selector match
                case Some(BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode)) =>
                    val modeOperator: String = PropertiesSelectorMode.getModeStringOperator(mode)

                    val propertiesEvalCode = propertiesNames.map { propertyName =>
                        val resultEvalCode =
                            s"""isNullOrStringNull(message.properties?["${propertyName}"]?.toLowerCase().replaceAll('\"', '\\\\' + '\"'))"""

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

object BasicMessageFilterOperationIsNull:
    def apply(targetString: String): BasicMessageFilterOperationIsNull =
        new BasicMessageFilterOperationIsNull(
            BasicMessageFilterOperationType.IsNull
        )

    def unapply(op: BasicMessageFilterOperationIsNull): Boolean = true

    given Decoder[BasicMessageFilterOperationIsNull] = deriveDecoder[BasicMessageFilterOperationIsNull]
    given Encoder[BasicMessageFilterOperationIsNull] = deriveEncoder[BasicMessageFilterOperationIsNull]
