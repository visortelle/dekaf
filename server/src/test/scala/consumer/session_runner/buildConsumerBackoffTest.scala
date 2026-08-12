package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.value_projections.ValueProjectionList
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.impl.ConsumerBuilderImpl
import zio.test.*

import java.util.concurrent.TimeUnit
import scala.util.Try

/** What `buildConsumer` arms for NEGATIVE-ACKNOWLEDGMENT redelivery.
  *
  * Regression context: it set `negativeAckRedeliveryDelay(0, SECONDS)`, which the client floors to
  * 100ms, so every sustained nack source became a ten-per-second redelivery hammer - a paused
  * session nacks everything it receives, and a delivery that throws mid-batch is handed back the
  * same way. (The start-from merge used to be the loudest source, nacking whatever it declined at
  * its memory cap; it now pauses hot consumers instead and declines nothing.) A session pinned at the cap by one silent stream
  * therefore redelivered its whole held set every ~100ms indefinitely - a permanent, silent storm
  * of nack/redeliver traffic against the broker.
  *
  * A DECAYING backoff keeps the cases that should be prompt prompt (the first redelivery is still
  * 100ms, so pause/resume feels immediate) while a message bounced over and over backs off toward
  * a 10s ceiling, so the storm cools instead of spinning at the floor rate.
  *
  * The client is real and aimed at a closed port - building a consumer configuration connects to
  * nothing. Asserted through `ConsumerBuilderImpl.getConf`, the same configuration `subscribe()`
  * would use.
  */
object buildConsumerBackoffTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/nack-backoff"

    private def targetConfig: ConsumerSessionTarget =
        ConsumerSessionTarget(
            isEnabled = true,
            consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
            messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
            topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(topicFqn))),
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    def spec = suite(this.getClass.toString)(
        test("nack redelivery DECAYS from 100ms to a 10s ceiling instead of hammering at a flat floor") {
            val client = PulsarClient.builder.serviceUrl("pulsar://127.0.0.1:1").operationTimeout(2, TimeUnit.SECONDS).build
            try
                val builder = buildConsumer(
                    pulsarClient = client,
                    consumerName = "cs-nack-backoff-0",
                    topicsToConsume = Vector(topicFqn),
                    listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())),
                    targetConfig = targetConfig
                ).toOption.get
                val conf = builder.asInstanceOf[ConsumerBuilderImpl[Array[Byte]]].getConf
                val backoff = Option(conf.getNegativeAckRedeliveryBackoff)
                val delays = (0 to 20).toVector.map(redeliveryCount => backoff.map(_.next(redeliveryCount)).getOrElse(-1L))
                assertTrue(
                    backoff.isDefined,
                    delays.head == 100L,
                    delays.last == 10_000L,
                    delays.forall(_ <= 10_000L),
                    delays.zip(delays.tail).forall((sooner, later) => sooner <= later)
                ) ?? s"negativeAckRedeliveryBackoff=$backoff delays=$delays"
            finally
                Try(client.close())
                ()
        }
    )
