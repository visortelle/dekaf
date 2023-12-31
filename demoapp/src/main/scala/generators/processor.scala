package generators

import _root_.client.pulsarClient
import org.apache.pulsar.client.api.{Consumer, MessageListener, Producer, Schema, SubscriptionInitialPosition, SubscriptionType, Message as PulsarMessage}
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import zio.*

import scala.jdk.FutureConverters.*

type ProcessorName = String
type ProcessorIndex = Int

type WorkerIndex = Int
type WorkerName = String

type ProcessorMessageListenerBuilder[A, B] = (ProcessorWorker[A, B], Producer[B]) => MessageListener[A]

case class ProcessorWorker[A, B](
  consumingTopicPlan: TopicPlan,
  producingTopicPlan: TopicPlan,
  producerPlan: ProducerPlan,
  subscriptionPlan: SubscriptionPlan,
  consumerPlan: ConsumerPlan,
)

object ProcessorWorkerExecutor:
  private def startProducer[A, B](worker: ProcessorWorker[A, B]): Task[Producer[B]] =
    ZIO.attempt {
      val schema = new AutoProduceBytesSchema[Array[Byte]]

      val producer: Producer[Array[Byte]] = pulsarClient
        .newProducer(schema)
        .producerName(worker.producerPlan.name)
        .topic(worker.producingTopicPlan.topicFqn)
        .create

      producer.asInstanceOf[Producer[B]]
    }

  private def startConsumer[A, B](
    worker: ProcessorWorker[A, B],
    producer: Producer[B],
    mkMessageListenerBuilder: ProcessorMessageListenerBuilder[A, B]
  ) =
    for {
      consumer <- ZIO.attempt {
        val schema = Schema.getSchema(worker.consumingTopicPlan.schemaInfos.head).asInstanceOf[Schema[A]]

        pulsarClient.newConsumer(schema)
          .subscriptionName(worker.subscriptionPlan.name)
          .subscriptionType(worker.subscriptionPlan.subscriptionType)
          .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
          .consumerName(worker.consumerPlan.name)
          .topic(worker.consumingTopicPlan.topicFqn)
          .messageListener(mkMessageListenerBuilder(worker, producer))
          .subscribe
      }
      _ <- ZIO.logInfo(
        s"Started processor consumer: \"${worker.consumerPlan.name}\" " +
        s"from topic: \"${worker.consumingTopicPlan.topicFqn}\" " +
        s"to topic: \"${worker.producingTopicPlan.topicFqn}\"."
      )
    } yield consumer

  def start[A, B](
    worker: ProcessorWorker[A, B],
    mkMessageListenerBuilder: ProcessorMessageListenerBuilder[A, B]
  ): Task[Unit] =
    for {
      producer <- startProducer(worker)
      consumer <- startConsumer(worker, producer, mkMessageListenerBuilder)
    } yield ()


case class ProcessorPlan[A, B](
  name: ProcessorName,
  workers: Vector[ProcessorWorker[A, B]],
  messageListenerBuilder: ProcessorMessageListenerBuilder[A, B],
)

object ProcessorPlan:
  private def makeProducerPlans(
    mkName: ProducerIndex => ProducerName,
    producerCount: Int
  ): Task[Vector[ProducerPlan]] =
    for {
      producerPlanGenerator <- ProducerPlanGenerator.make(mkName = mkName)
      producerPlans <- ZIO.foreachPar(0 until producerCount) { producerIndex =>
        ProducerPlan.make(producerPlanGenerator, producerIndex)
      }
    } yield producerPlans.toVector

  private def makeConsumerPlans(
    mkName: ConsumerIndex => ConsumerName,
    consumerCount: Int
  ): Task[Vector[ConsumerPlan]] =
    for {
      consumerPlanGenerator <- ConsumerPlanGenerator.make(mkName = mkName)
      consumerPlans <- ZIO.foreachPar(0 until consumerCount) { consumerIndex =>
        ConsumerPlan.make(consumerPlanGenerator, consumerIndex)
      }
    } yield consumerPlans.toVector

  def make[A, B](
    processorPlanGenerator: ProcessorPlanGenerator[A, B],
    processorIndex: ProcessorIndex
  ): Task[ProcessorPlan[A, B]] =
    for {
      consumingTopicPlan <- processorPlanGenerator.mkConsumingTopicPlan(processorIndex)
      producingTopicPlan <- processorPlanGenerator.mkProducingTopicPlan(processorIndex)
      subscriptionPlan <- processorPlanGenerator.mkSubscriptionPlan(processorIndex)
      workerCount = processorPlanGenerator.mkWorkerCount(processorIndex)
      producerPlans <- makeProducerPlans(processorPlanGenerator.mkWorkerProducerName(processorIndex), workerCount)
      consumerPlans <- makeConsumerPlans(processorPlanGenerator.mkWorkerConsumerName(processorIndex), workerCount)
      workers <- ZIO.foreachPar(producerPlans zip consumerPlans) {
        case (producerPlan, consumerPlan) =>
          ZIO.succeed(
            ProcessorWorker[A, B](
              consumingTopicPlan,
              producingTopicPlan,
              producerPlan,
              subscriptionPlan,
              consumerPlan
            )
          )
      }
      messageListenerBuilder = processorPlanGenerator.mkMessageListenerBuilder(processorIndex)
    } yield
      ProcessorPlan[A, B](
        processorPlanGenerator.mkName(processorIndex),
        workers,
        messageListenerBuilder
      )

case class ProcessorPlanGenerator[A, B](
  mkName: ProcessorIndex => ProcessorName,
  mkConsumingTopicPlan: ProcessorIndex => Task[TopicPlan],
  mkProducingTopicPlan: ProcessorIndex => Task[TopicPlan],
  mkSubscriptionPlan: ProcessorIndex => Task[SubscriptionPlan],
  mkWorkerCount: ProcessorIndex => Int,
  mkWorkerConsumerName: ProcessorIndex => ConsumerIndex => WorkerName,
  mkWorkerProducerName: ProcessorIndex => ProducerIndex => WorkerName,
  mkMessageListenerBuilder: ProcessorIndex =>  ProcessorMessageListenerBuilder[A, B],
)

object ProcessorPlanGenerator:
  def make[A, B](
    mkName: ProcessorIndex => ProcessorName = processorIndex => s"dekaf-processor-$processorIndex",
    mkConsumingTopicPlan: ProcessorIndex => Task[TopicPlan] = _ => TopicPlan.make,
    mkProducingTopicPlan: ProcessorIndex => Task[TopicPlan] = _ => TopicPlan.make,
    mkSubscriptionPlan: ProcessorIndex => Task[SubscriptionPlan] = _ => SubscriptionPlan.make(SubscriptionType.Shared),
    mkWorkerCount: ProcessorIndex => Int = _ => 1,
    mkWorkerConsumerName: ProcessorIndex => ConsumerIndex => WorkerName =
      processorIndex => consumerIndex => s"dekaf-processor-worker-$processorIndex-$consumerIndex",
    mkWorkerProducerName: ProcessorIndex => ProducerIndex => WorkerName =
      processorIndex => producerIndex => s"dekaf-processor-worker-$processorIndex-$producerIndex",
    mkMessageListenerBuilder: ProcessorIndex => ProcessorMessageListenerBuilder[A, B] =
    _ =>
      (worker: ProcessorWorker[A, B], producer: Producer[B]) =>
        (consumer: Consumer[A], msg: PulsarMessage[A]) =>
          consumer.acknowledge(msg)
  ): Task[ProcessorPlanGenerator[A, B]] =
    val processorPlanGenerator = ProcessorPlanGenerator[A, B](
      mkName,
      mkConsumingTopicPlan,
      mkProducingTopicPlan,
      mkSubscriptionPlan,
      mkWorkerCount,
      mkWorkerConsumerName,
      mkWorkerProducerName,
      mkMessageListenerBuilder
    )
    ZIO.succeed(processorPlanGenerator)

object ProcessorPlanExecutor:
  def start[A, B](processorPlan: ProcessorPlan[A, B]): Task[Unit] =
    for {
      _ <- ZIO.logInfo(s"Starting processor: \"${processorPlan.name}\".")
      _ <- ZIO.foreachParDiscard(processorPlan.workers) { worker =>
        for {
          _ <- ProcessorWorkerExecutor.start(worker, processorPlan.messageListenerBuilder)
          _ <- ZIO.logInfo(s"Started processor worker with consumer: \"${worker.consumerPlan.name}\" and producer: \"${worker.producerPlan.name}\"")
        } yield ()
      }
    } yield ()
