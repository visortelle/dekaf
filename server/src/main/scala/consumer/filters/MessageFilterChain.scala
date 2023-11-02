package consumer.filters

import consumer.filters.MessageFilter.testMessageFilter
import consumer.filters.jsFilter.JsMessageFilter
import consumer.{FilterTestErrorMessage, FilterTestResult, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class MessageFilterChain(
    isEnabled: Boolean,
    isNegated: Boolean,
    mode: MessageFilterChainMode,
    filters: List[MessageFilter]
)

object MessageFilterChain:
    def testMessageFilterChain(
        filterChain: MessageFilterChain,
        messageFilterContext: MessageFilterContext,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): FilterTestResult =
        var chain = filterChain

        // Each message filters mutate global state.
        // For example: it stores the last message in the global variable `lastMessage`.
        // To make it work properly, at least one filter should always present.
        if (chain.filters.isEmpty || !chain.isEnabled)
            chain = MessageFilterChain(
                isEnabled = true,
                isNegated = false,
                mode = MessageFilterChainMode.All,
                filters = List(
                    MessageFilter(
                        isEnabled = true,
                        isNegated = false,
                        value = JsMessageFilter(jsCode = "() => true")
                    )
                )
            )

        val filterResults = chain.filters
            .filter(_.isEnabled)
            .map(f => testMessageFilter(f, messageFilterContext, jsonMessage, jsonValue, schemaType))

        val maybeErr = filterResults.find(fr => fr._1.isLeft)
        val filterChainResult: Either[FilterTestErrorMessage, Boolean] = {
            maybeErr match
                case Some(Left(err: FilterTestErrorMessage), _) => Left(err)
                case _ =>
                    chain.mode match
                        case MessageFilterChainMode.All =>
                            Right(filterResults.forall(fr => fr._1.getOrElse(false)))
                        case MessageFilterChainMode.Any =>
                            Right(filterResults.exists(fr => fr._1.getOrElse(false)))
                        case MessageFilterChainMode.Unspecified =>
                            Left("Filter chain mode is not specified")
        }.fold(
            err => Left(err),
            bool => Right(if chain.isNegated then !bool else bool)
        )

        if filterResults.nonEmpty then
            val (_, jsonAggregate) = filterResults.last
            (filterChainResult, jsonAggregate)
        else (filterChainResult, "{}")
