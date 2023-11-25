package consumer.message_filter.basic_message_filter.logic

case class BasicMessageFilterBraces (
    mode: BasicMessageFilterBracesMode,
    ops: Vector[BasicMessageFilterOp]
)
