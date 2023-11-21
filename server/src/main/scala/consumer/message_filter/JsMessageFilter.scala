package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class JsMessageFilter(jsCode: String)

object JsMessageFilter:
    def fromPb(v: pb.JsMessageFilter): JsMessageFilter =
        JsMessageFilter(jsCode = v.jsCode)

    def toPb(v: JsMessageFilter): pb.JsMessageFilter =
        pb.JsMessageFilter(jsCode = v.jsCode)
