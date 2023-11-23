package consumer.message_filter.basic_message_filter.operations

trait TestOpTrait:
    def genJsCode(targetVar: String): Either[String, String]
