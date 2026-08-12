package consumer

/** Convert one protobuf field, NAMING THE PATH when it fails.
  *
  * A consumer session config is a tree - targets, each with a selector, a consumption mode, a
  * deserializer and three chains - and every one of those conversions refuses an absent or unknown
  * oneof by throwing. What reached the client was the innermost message alone: "Invalid
  * ConsumerSessionTargetConsumptionMode mode." over a session with nine targets, with nothing
  * saying which. Wrapping each conversion in its field's name composes into the path
  * (`targets[3]: consumption_mode: ...`), which is the difference between a session the user can
  * repair and one they can only rebuild.
  *
  * The original is kept as the cause, so nothing about the failure is lost.
  */
def atProtoField[A](path: String)(convert: => A): A =
    try convert
    catch
        case err: Throwable =>
            throw new IllegalArgumentException(s"$path: ${Option(err.getMessage).getOrElse(err.getClass.getSimpleName)}", err)
