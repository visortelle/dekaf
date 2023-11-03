package consumer

import zio.*
import com.tools.teal.pulsar.ui.api.v1.consumer.{CreateConsumerSessionRequest, CreateConsumerSessionResponse, DeleteConsumerSessionRequest, DeleteConsumerSessionResponse, PauseConsumerSessionRequest, PauseConsumerSessionResponse, ResumeConsumerSessionRequest, ResumeConsumerSessionResponse, RunCodeRequest, RunCodeResponse, ZioConsumer}
import io.grpc.StatusException
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient

object ConsumerServiceImpl extends ZioConsumer.ZConsumerService[PulsarAdmin with PulsarClient]:
    override def createConsumerSession(request: CreateConsumerSessionRequest, context: PulsarAdmin with Any): IO[StatusException, CreateConsumerSessionResponse] = ???

    override def resumeConsumerSession(request: ResumeConsumerSessionRequest, context: PulsarAdmin with Any): stream.Stream[StatusException, ResumeConsumerSessionResponse] = ???

    override def pauseConsumerSession(request: PauseConsumerSessionRequest, context: PulsarAdmin with Any): IO[StatusException, PauseConsumerSessionResponse] = ???

    override def deleteConsumerSession(request: DeleteConsumerSessionRequest, context: PulsarAdmin with Any): IO[StatusException, DeleteConsumerSessionResponse] = ???

    override def runCode(request: RunCodeRequest, context: PulsarAdmin with Any): IO[StatusException, RunCodeResponse] = ???

